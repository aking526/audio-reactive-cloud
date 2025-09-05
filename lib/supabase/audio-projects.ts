import { createClient } from '@/lib/supabase/client';

export interface AudioEffectsSettings {
  bass_boost?: {
    enabled: boolean;
    amount: number;
  };
  speed_control?: {
    enabled: boolean;
    speed: number;
  };
  pitch_shift?: {
    enabled: boolean;
    semitones: number;
  };
  volume?: {
    level: number;
  };
}

export interface AudioProject {
  id: string;
  user_id: string;
  project_name: string;
  original_filename: string;
  original_file_url: string;
  processed_file_url?: string;
  file_size_bytes: number;
  duration_seconds?: number;
  mime_type: string;
  effects_settings: AudioEffectsSettings;
  created_at: string;
  updated_at: string;
}

export interface CreateAudioProjectData {
  project_name: string;
  original_filename: string;
  file_size_bytes: number;
  duration_seconds?: number;
  mime_type: string;
  effects_settings: AudioEffectsSettings;
}

class AudioProjectsService {
  private supabase = createClient();

  /**
   * Upload an audio file to Supabase storage
   */
  async uploadAudioFile(
    file: File, 
    userId: string, 
    projectId: string, 
    fileType: 'original' | 'processed' = 'original'
  ): Promise<string> {
    // Validate file size before upload
    const validation = validateFileSize(file);
    if (!validation.isValid) {
      throw new Error(validation.error || 'File size validation failed');
    }

    const bucket = fileType === 'original' ? 'audio-files-original' : 'audio-files-processed';
    const fileExtension = file.name.split('.').pop() || 'mp3';
    const fileName = `${userId}/${projectId}_${fileType}.${fileExtension}`;

    const { error } = await this.supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      throw new Error(`Failed to upload ${fileType} file: ${error.message}`);
    }

    // Get the public URL for the uploaded file
    const { data: urlData } = this.supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  }

  /**
   * Create a new audio project
   */
  async createProject(data: CreateAudioProjectData, originalFile: File): Promise<AudioProject> {
    try {
      // Get current user
      const { data: { user }, error: userError } = await this.supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // First, insert the project record to get the ID
      const { data: project, error: insertError } = await this.supabase
        .from('audio_projects')
        .insert({
          user_id: user.id,
          project_name: data.project_name,
          original_filename: data.original_filename,
          original_file_url: '', // Will be updated after upload
          file_size_bytes: data.file_size_bytes,
          duration_seconds: data.duration_seconds,
          mime_type: data.mime_type,
          effects_settings: data.effects_settings
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(`Failed to create project: ${insertError.message}`);
      }

      // Upload the original file
      const originalFileUrl = await this.uploadAudioFile(originalFile, user.id, project.id, 'original');

      // Update the project with the file URL
      const { data: updatedProject, error: updateError } = await this.supabase
        .from('audio_projects')
        .update({ original_file_url: originalFileUrl })
        .eq('id', project.id)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to update project with file URL: ${updateError.message}`);
      }

      return updatedProject;
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  }

  /**
   * Update an existing project
   */
  async updateProject(
    projectId: string, 
    updates: Partial<CreateAudioProjectData>
  ): Promise<AudioProject> {
    const { data, error } = await this.supabase
      .from('audio_projects')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update project: ${error.message}`);
    }

    return data;
  }

  /**
   * Get all projects for the current user
   */
  async getUserProjects(): Promise<AudioProject[]> {
    const { data, error } = await this.supabase
      .from('audio_projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch projects: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get a specific project by ID
   */
  async getProject(projectId: string): Promise<AudioProject | null> {
    const { data, error } = await this.supabase
      .from('audio_projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Project not found
      }
      throw new Error(`Failed to fetch project: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete a project
   */
  async deleteProject(projectId: string): Promise<void> {
    // First, get the project to find the file URLs
    const project = await this.getProject(projectId);
    
    // If project doesn't exist, it might have already been deleted
    // We should still try to clean up any remaining files and database records
    if (project) {
      // Delete files from storage
      const { data: { user } } = await this.supabase.auth.getUser();
      if (user) {
        // Delete original file
        if (project.original_file_url) {
          const originalFileName = `${user.id}/${projectId}_original.${project.original_filename.split('.').pop()}`;
          try {
            await this.supabase.storage
              .from('audio-files-original')
              .remove([originalFileName]);
          } catch (error) {
            console.warn('Failed to delete original file:', error);
            // Continue with deletion even if file removal fails
          }
        }

        // Delete processed file if it exists
        if (project.processed_file_url) {
          const processedFileName = `${user.id}/${projectId}_processed.${project.original_filename.split('.').pop()}`;
          try {
            await this.supabase.storage
              .from('audio-files-processed')
              .remove([processedFileName]);
          } catch (error) {
            console.warn('Failed to delete processed file:', error);
            // Continue with deletion even if file removal fails
          }
        }
      }
    }

    // Always attempt to delete the project record, even if project wasn't found above
    const { error } = await this.supabase
      .from('audio_projects')
      .delete()
      .eq('id', projectId);

    // Only throw an error if the database deletion fails with a real error
    // (not just "no rows affected" which would happen if already deleted)
    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to delete project: ${error.message}`);
    }
    
    // If we reach here, the deletion was successful or the project was already gone
  }

  /**
   * Upload processed audio file
   */
  async uploadProcessedAudio(
    projectId: string, 
    processedAudioBlob: Blob, 
    originalFileName: string
  ): Promise<string> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const fileExtension = originalFileName.split('.').pop() || 'mp3';
    const processedFile = new File([processedAudioBlob], `processed.${fileExtension}`, {
      type: processedAudioBlob.type || 'audio/mpeg'
    });

    const processedFileUrl = await this.uploadAudioFile(
      processedFile, 
      user.id, 
      projectId, 
      'processed'
    );

    // Update the project with the processed file URL
    await this.supabase
      .from('audio_projects')
      .update({ processed_file_url: processedFileUrl })
      .eq('id', projectId);

    return processedFileUrl;
  }

  /**
   * Get audio file as blob from URL
   */
  async getAudioFileBlob(fileUrl: string, bucket: string = 'audio-files-original'): Promise<Blob> {
    const path = extractPathFromPublicUrl(fileUrl, bucket);
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .createSignedUrl(path, 3600); // 1 hour expiration
    if (error) {
      throw new Error(`Failed to create signed URL: ${error.message}`);
    }
    const response = await fetch(data.signedUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch audio file: ${response.statusText}`);
    }
    return response.blob();
  }
}

export const audioProjectsService = new AudioProjectsService();

/**
 * Utility functions for file validation
 */
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB in bytes

export const validateFileSize = (file: File): { isValid: boolean; error?: string } => {
  if (file.size > MAX_FILE_SIZE) {
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    return {
      isValid: false,
      error: `File size too large: ${fileSizeMB}MB. Maximum allowed size is 50MB. Please compress your audio file or use a smaller file.`
    };
  }
  return { isValid: true };
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

function extractPathFromPublicUrl(publicUrl: string, bucket: string): string {
  const url = new URL(publicUrl);
  const parts = url.pathname.split(`/object/public/${bucket}/`);
  if (parts.length !== 2) {
    throw new Error('Invalid public URL format');
  }
  return parts[1];
}
