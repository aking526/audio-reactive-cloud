import { createClient } from '@/lib/supabase/client';

export interface SampleSong {
  name: string;
  fullPath: string;
  publicUrl: string;
  size: number;
  lastModified: string;
}

class SampleSongsService {
  private supabase = createClient();
  private bucketName = 'sample-songs';

  /**
   * Get all sample songs from the bucket
   */
  async getSampleSongs(): Promise<SampleSong[]> {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .list('', {
          limit: 100,
          sortBy: { column: 'name', order: 'asc' }
        });

      if (error) {
        throw new Error(`Failed to fetch sample songs: ${error.message}`);
      }

      if (!data) {
        return [];
      }

      // Filter for audio files only and map to SampleSong interface
      const audioFiles = data.filter(file => {
        const extension = file.name.split('.').pop()?.toLowerCase();
        return extension && ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(extension);
      });

      const sampleSongs: SampleSong[] = audioFiles.map(file => {
        const { data: urlData } = this.supabase.storage
          .from(this.bucketName)
          .getPublicUrl(file.name);

        return {
          name: this.formatSongName(file.name),
          fullPath: file.name,
          publicUrl: urlData.publicUrl,
          size: file.metadata?.size || 0,
          lastModified: file.updated_at || file.created_at || ''
        };
      });

      return sampleSongs;
    } catch (error) {
      console.error('Error fetching sample songs:', error);
      throw error;
    }
  }

  /**
   * Get a sample song file as a blob
   */
  async getSampleSongBlob(fullPath: string): Promise<Blob> {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .createSignedUrl(fullPath, 3600); // 1 hour expiration

      if (error) {
        throw new Error(`Failed to create signed URL: ${error.message}`);
      }

      const response = await fetch(data.signedUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch sample song: ${response.statusText}`);
      }

      return response.blob();
    } catch (error) {
      console.error('Error fetching sample song blob:', error);
      throw error;
    }
  }

  /**
   * Convert a sample song to a File object
   */
  async getSampleSongAsFile(song: SampleSong): Promise<File> {
    try {
      const blob = await this.getSampleSongBlob(song.fullPath);
      
      // Extract file extension and determine MIME type
      const extension = song.fullPath.split('.').pop()?.toLowerCase() || 'mp3';
      const mimeType = this.getMimeType(extension);
      
      const file = new File([blob], song.fullPath, { 
        type: mimeType 
      });

      return file;
    } catch (error) {
      console.error('Error converting sample song to file:', error);
      throw error;
    }
  }

  /**
   * Format the song name for display (remove extension, clean up)
   */
  private formatSongName(fileName: string): string {
    // Remove file extension
    const nameWithoutExtension = fileName.replace(/\.[^/.]+$/, '');
    
    // Replace underscores with spaces, but preserve hyphens (especially artist - song format)
    let formatted = nameWithoutExtension.replace(/_/g, ' ').trim();
    
    // Handle the common "Artist - Song" format by ensuring proper spacing around dash
    formatted = formatted.replace(/\s*-\s*/g, ' - ');
    
    // Smart capitalization: capitalize first letter of each word, but be smarter about it
    const words = formatted.split(' ');
    return words
      .map((word, index) => {
        if (word === '-') return word; // Keep dashes as-is
        if (word.length === 0) return word;
        
        // Extract the core word without punctuation for checking
        const punctuationMatch = word.match(/^([^\w]*)(\w+)([^\w]*)$/);
        if (!punctuationMatch) return word; // If no word found, return as-is
        
        const [, prefix, coreWord, suffix] = punctuationMatch;
        
        // Common abbreviations and terms that should stay uppercase
        const uppercaseWords = [
          'DJ', 'MC', 'LP', 'EP', 'UK', 'US', 'USA', 'NYC', 'LA', 'MPH', 'BPM', 
          'FM', 'AM', 'TV', 'CD', 'DVD', 'VIP', 'CEO', 'NYC', 'LA', 'SF', 'DC'
        ];
        
        // Common music terms that should be properly capitalized
        const properCaseWords: { [key: string]: string } = {
          'remix': 'Remix',
          'edit': 'Edit', 
          'mix': 'Mix',
          'version': 'Version',
          'feat': 'Feat',
          'featuring': 'Featuring',
          'vs': 'vs', // Keep lowercase for "vs"
          'and': 'and', // Keep lowercase for "and"
          'the': 'the', // Keep lowercase for "the" unless it's at the start
          'a': 'a', // Keep lowercase for "a" unless it's at the start
          'an': 'an', // Keep lowercase for "an" unless it's at the start
          'of': 'of',
          'in': 'in',
          'on': 'on',
          'at': 'at',
          'by': 'by',
          'for': 'for',
          'with': 'with'
        };
        
        const upperCoreWord = coreWord.toUpperCase();
        const lowerCoreWord = coreWord.toLowerCase();
        
        // Check if it's a known uppercase abbreviation
        if (uppercaseWords.includes(upperCoreWord)) {
          return prefix + upperCoreWord + suffix;
        }
        
        // Check if it's a known proper case word
        if (properCaseWords.hasOwnProperty(lowerCoreWord)) {
          // Always capitalize articles at the beginning of the title or after a dash
          if ((lowerCoreWord === 'the' || lowerCoreWord === 'a' || lowerCoreWord === 'an') && 
              (index === 0 || (index > 0 && words[index - 1] === '-'))) {
            const titleCased = coreWord.charAt(0).toUpperCase() + coreWord.slice(1).toLowerCase();
            return prefix + titleCased + suffix;
          }
          return prefix + properCaseWords[lowerCoreWord] + suffix;
        }
        
        // Don't over-capitalize words that are already properly cased
        // If word has mixed case, preserve it; otherwise apply title case
        if (coreWord === coreWord.toLowerCase() || coreWord === coreWord.toUpperCase()) {
          const titleCased = coreWord.charAt(0).toUpperCase() + coreWord.slice(1).toLowerCase();
          return prefix + titleCased + suffix;
        }
        
        return word; // Preserve existing mixed case
      })
      .join(' ')
      .replace(/\s+/g, ' ') // Clean up any extra spaces
      .trim();
  }

  /**
   * Get MIME type based on file extension
   */
  private getMimeType(extension: string): string {
    const mimeTypes: { [key: string]: string } = {
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'ogg': 'audio/ogg',
      'm4a': 'audio/mp4',
      'aac': 'audio/aac',
      'flac': 'audio/flac'
    };

    return mimeTypes[extension] || 'audio/mpeg';
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}

export const sampleSongsService = new SampleSongsService();
