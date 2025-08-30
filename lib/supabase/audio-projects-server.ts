import { createClient } from '@/lib/supabase/server';
import { AudioProject } from './audio-projects';

/**
 * Server-side service for audio projects
 * Only use this in Server Components, API routes, or server actions
 */
export class AudioProjectsServerService {
  private async getSupabase() {
    return await createClient();
  }

  async getUserProjects(): Promise<AudioProject[]> {
    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      .from('audio_projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch projects: ${error.message}`);
    }

    return data || [];
  }

  async getProject(projectId: string): Promise<AudioProject | null> {
    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      .from('audio_projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch project: ${error.message}`);
    }

    return data;
  }
}

export const audioProjectsServerService = new AudioProjectsServerService();