import { supabase } from './supabase';
import { SessionSummary, GradeSettings, ClimbType, Climb } from '../types';
import { getDisplayGrade } from '../utils/gradeUtils';

const STRAVA_CLIENT_ID = process.env.EXPO_PUBLIC_STRAVA_CLIENT_ID || '';
const STRAVA_AUTH_URL = 'https://www.strava.com/oauth/mobile/authorize';
const STRAVA_API_BASE = 'https://www.strava.com/api/v3';

class StravaService {
  private userId: string | null = null;

  setUserId(userId: string | null) {
    this.userId = userId;
  }

  getAuthorizeUrl(redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: STRAVA_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      approval_prompt: 'auto',
      scope: 'activity:write',
    });
    return `${STRAVA_AUTH_URL}?${params.toString()}`;
  }

  async isConnected(): Promise<boolean> {
    if (!this.userId) return false;
    const { data, error } = await supabase
      .from('user_integrations')
      .select('id')
      .eq('user_id', this.userId)
      .eq('provider', 'strava')
      .single();
    return !error && !!data;
  }

  async exchangeCodeForTokens(code: string): Promise<boolean> {
    if (!this.userId) return false;

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return false;

    const { data: responseBody, error: fnError } = await supabase.functions.invoke('strava-token', {
      body: { grant_type: 'authorization_code', code },
    });

    // responseBody may be the error body when fnError is set
    console.log('Strava token response:', JSON.stringify(responseBody));
    console.log(
      'Strava token fnError:',
      fnError
        ? JSON.stringify({
            message: fnError.message,
            name: fnError.name,
            context: (fnError as Record<string, unknown>).context,
          })
        : 'none'
    );
    if (fnError) {
      // Try to read the response body from the error context
      try {
        const errorContext = (fnError as Record<string, unknown>).context as
          | { json?: () => Promise<unknown> }
          | undefined;
        if (errorContext?.json) {
          const errorBody = await errorContext.json();
          console.log('Edge function error body:', JSON.stringify(errorBody));
        }
      } catch {
        /* ignore parse errors */
      }
      return false;
    }
    if (!responseBody?.access_token) return false;

    const { error } = await supabase.from('user_integrations').upsert(
      {
        user_id: this.userId,
        provider: 'strava',
        access_token: responseBody.access_token,
        refresh_token: responseBody.refresh_token,
        expires_at: responseBody.expires_at,
        athlete_id: responseBody.athlete?.id || null,
      },
      { onConflict: 'user_id,provider' }
    );

    if (error) console.error('Supabase upsert error:', error);
    return !error;
  }

  async getAccessToken(): Promise<string | null> {
    if (!this.userId) return null;

    const { data, error } = await supabase
      .from('user_integrations')
      .select('access_token, refresh_token, expires_at')
      .eq('user_id', this.userId)
      .eq('provider', 'strava')
      .single();

    if (error || !data) return null;

    // Refresh if token expires within 5 minutes
    const now = Math.floor(Date.now() / 1000);
    if (data.expires_at < now + 300) {
      const refreshed = await this.refreshAccessToken(data.refresh_token);
      if (!refreshed) return null;
      // Re-fetch updated token
      const { data: updated } = await supabase
        .from('user_integrations')
        .select('access_token')
        .eq('user_id', this.userId)
        .eq('provider', 'strava')
        .single();
      return updated?.access_token || null;
    }

    return data.access_token;
  }

  private async refreshAccessToken(refreshToken: string): Promise<boolean> {
    const { data: tokens, error: fnError } = await supabase.functions.invoke('strava-token', {
      body: { grant_type: 'refresh_token', refresh_token: refreshToken },
    });

    if (fnError || !tokens?.access_token) return false;

    const { error } = await supabase
      .from('user_integrations')
      .update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.expires_at,
      })
      .eq('user_id', this.userId!)
      .eq('provider', 'strava');

    return !error;
  }

  async createActivity(
    summary: SessionSummary,
    sessionName: string,
    gradeSettings: GradeSettings
  ): Promise<{ ok: boolean; activityId?: number }> {
    const accessToken = await this.getAccessToken();
    if (!accessToken) return { ok: false };

    const description = this.buildDescription(summary, gradeSettings);
    const elapsedTimeSeconds = Math.round(summary.duration / 1000);

    const response = await fetch(`${STRAVA_API_BASE}/activities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        name: sessionName,
        type: 'RockClimbing',
        sport_type: 'RockClimbing',
        start_date_local: summary.startTime,
        elapsed_time: elapsedTimeSeconds,
        description,
      }),
    });

    if (!response.ok) return { ok: false };
    try {
      const data = await response.json();
      return { ok: true, activityId: data.id };
    } catch {
      return { ok: true };
    }
  }

  async saveStravaActivityId(sessionId: string, activityId: number): Promise<void> {
    if (!this.userId) return;
    const { error } = await supabase
      .from('sessions')
      .update({ strava_activity_id: activityId })
      .eq('id', sessionId)
      .eq('user_id', this.userId);
    if (error) console.error('Error saving Strava activity ID:', error);
  }

  private buildDescription(summary: SessionSummary, gradeSettings: GradeSettings): string {
    const lines: string[] = [];
    lines.push(
      `${summary.sends} sends | ${summary.attempts} attempts | ${summary.totalClimbs} total climbs`
    );
    lines.push('');

    const types: ClimbType[] = ['boulder', 'sport', 'trad'];
    for (const type of types) {
      const grades = summary.gradesByType[type];
      if (grades.length === 0) continue;

      const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
      const parts: string[] = [];
      for (const g of grades) {
        const display = getDisplayGrade({ grade: g.grade, type } as Climb, gradeSettings);
        if (g.sends > 0) parts.push(`${display} x${g.sends}`);
        if (g.attempts > 0) parts.push(`${display} x${g.attempts} att`);
      }
      lines.push(`${typeLabel}: ${parts.join(', ')}`);
    }

    const maxParts: string[] = [];
    if (summary.maxGradeByType.boulder) {
      const display = getDisplayGrade(
        { grade: summary.maxGradeByType.boulder, type: 'boulder' } as Climb,
        gradeSettings
      );
      maxParts.push(`Boulder ${display}`);
    }
    if (summary.maxGradeByType.sport) {
      const display = getDisplayGrade(
        { grade: summary.maxGradeByType.sport, type: 'sport' } as Climb,
        gradeSettings
      );
      maxParts.push(`Sport ${display}`);
    }
    if (summary.maxGradeByType.trad) {
      const display = getDisplayGrade(
        { grade: summary.maxGradeByType.trad, type: 'trad' } as Climb,
        gradeSettings
      );
      maxParts.push(`Trad ${display}`);
    }
    if (maxParts.length > 0) {
      lines.push('');
      lines.push(`Max: ${maxParts.join(' | ')}`);
    }

    lines.push('');
    lines.push('Logged with Float Climbing');

    return lines.join('\n');
  }

  async disconnect(): Promise<boolean> {
    if (!this.userId) return false;
    const { error } = await supabase
      .from('user_integrations')
      .delete()
      .eq('user_id', this.userId)
      .eq('provider', 'strava');
    return !error;
  }
}

export const stravaService = new StravaService();
