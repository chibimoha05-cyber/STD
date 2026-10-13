export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      publishers: {
        Row: {
          id: string
          email: string
          full_name: string | null
          created_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          created_at?: string
        }
      }
      courses: {
        Row: {
          id: string
          code: string
          name_ar: string
          name_en: string
          instructor_ar: string
          instructor_en: string
          color: string
          credits: number
          desc_ar: string
          desc_en: string
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          code: string
          name_ar: string
          name_en: string
          instructor_ar: string
          instructor_en: string
          color?: string
          credits?: number
          desc_ar?: string
          desc_en?: string
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          name_ar?: string
          name_en?: string
          instructor_ar?: string
          instructor_en?: string
          color?: string
          credits?: number
          desc_ar?: string
          desc_en?: string
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
      }
      slots: {
        Row: {
          id: string
          course_id: string
          weekday: number
          start_time: string
          end_time: string
          room: string
          kind: 'lecture' | 'lab'
          created_at: string
        }
        Insert: {
          id?: string
          course_id: string
          weekday: number
          start_time: string
          end_time: string
          room: string
          kind: 'lecture' | 'lab'
          created_at?: string
        }
        Update: {
          id?: string
          course_id?: string
          weekday?: number
          start_time?: string
          end_time?: string
          room?: string
          kind?: 'lecture' | 'lab'
          created_at?: string
        }
      }
      schedule_exceptions: {
        Row: {
          id: string
          slot_id: string
          exception_date: string
          type: 'cancelled' | 'moved' | 'room'
          start_time: string | null
          end_time: string | null
          room: string | null
          note_ar: string
          note_en: string
          created_at: string
        }
        Insert: {
          id?: string
          slot_id: string
          exception_date: string
          type: 'cancelled' | 'moved' | 'room'
          start_time?: string | null
          end_time?: string | null
          room?: string | null
          note_ar?: string
          note_en?: string
          created_at?: string
        }
        Update: {
          id?: string
          slot_id?: string
          exception_date?: string
          type?: 'cancelled' | 'moved' | 'room'
          start_time?: string | null
          end_time?: string | null
          room?: string | null
          note_ar?: string
          note_en?: string
          created_at?: string
        }
      }
      resources: {
        Row: {
          id: string
          course_id: string
          type: 'notes' | 'summary' | 'source' | 'prep' | 'pastExam' | 'other'
          title_ar: string
          title_en: string
          published_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          course_id: string
          type: 'notes' | 'summary' | 'source' | 'prep' | 'pastExam' | 'other'
          title_ar: string
          title_en: string
          published_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          course_id?: string
          type?: 'notes' | 'summary' | 'source' | 'prep' | 'pastExam' | 'other'
          title_ar?: string
          title_en?: string
          published_at?: string
          created_at?: string
          updated_at?: string
        }
      }
      activities: {
        Row: {
          id: string
          course_id: string
          kind: 'exam' | 'assignment'
          title_ar: string
          title_en: string
          due_date: string
          due_time: string
          place_ar: string
          place_en: string
          desc_ar: string
          desc_en: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          course_id: string
          kind: 'exam' | 'assignment'
          title_ar: string
          title_en: string
          due_date: string
          due_time?: string
          place_ar?: string
          place_en?: string
          desc_ar?: string
          desc_en?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          course_id?: string
          kind?: 'exam' | 'assignment'
          title_ar?: string
          title_en?: string
          due_date?: string
          due_time?: string
          place_ar?: string
          place_en?: string
          desc_ar?: string
          desc_en?: string
          created_at?: string
          updated_at?: string
        }
      }
      reports: {
        Row: {
          id: string
          course_id: string
          category: 'course' | 'lab' | 'project'
          title_ar: string
          title_en: string
          author_ar: string
          author_en: string
          published_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          course_id: string
          category: 'course' | 'lab' | 'project'
          title_ar: string
          title_en: string
          author_ar?: string
          author_en?: string
          published_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          course_id?: string
          category?: 'course' | 'lab' | 'project'
          title_ar?: string
          title_en?: string
          author_ar?: string
          author_en?: string
          published_at?: string
          created_at?: string
          updated_at?: string
        }
      }
      attachments: {
        Row: {
          id: string
          resource_id: string | null
          activity_id: string | null
          report_id: string | null
          file_name: string
          file_size_bytes: number
          mime_type: string
          access: 'public' | 'restricted'
          storage_bucket: string
          storage_path: string
          version: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          resource_id?: string | null
          activity_id?: string | null
          report_id?: string | null
          file_name: string
          file_size_bytes?: number
          mime_type?: string
          access?: 'public' | 'restricted'
          storage_bucket: string
          storage_path: string
          version?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          resource_id?: string | null
          activity_id?: string | null
          report_id?: string | null
          file_name?: string
          file_size_bytes?: number
          mime_type?: string
          access?: 'public' | 'restricted'
          storage_bucket?: string
          storage_path?: string
          version?: number
          created_at?: string
          updated_at?: string
        }
      }
      storage_cleanup_queue: {
        Row: {
          id: string
          attachment_id: string | null
          storage_bucket: string
          storage_path: string
          status: 'pending' | 'processing' | 'completed' | 'failed'
          attempts: number
          last_error: string | null
          created_at: string
          processed_at: string | null
        }
        Insert: {
          id?: string
          attachment_id?: string | null
          storage_bucket: string
          storage_path: string
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          attempts?: number
          last_error?: string | null
          created_at?: string
          processed_at?: string | null
        }
        Update: {
          id?: string
          attachment_id?: string | null
          storage_bucket?: string
          storage_path?: string
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          attempts?: number
          last_error?: string | null
          created_at?: string
          processed_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_publisher: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Enums = never
