import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import {
  Lesson,
  StudentLesson,
  StudentLessonStatus,
  CreateLessonInput
} from '../models/lesson.model';

@Injectable({
  providedIn: 'root'
})
export class LessonService {
  private supabase = this.supabaseService.getClient();

  constructor(private supabaseService: SupabaseService) {}

  async getLessonsByCourse(courseId: string): Promise<Lesson[]> {
    const { data, error } = await this.supabase
      .from('lessons')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true });

    if (error) {
      throw error;
    }

    return (data || []).map((item: any) => ({
      id: item.id,
      courseId: item.course_id,
      title: item.title,
      summary: item.summary,
      objective: item.objective,
      content: item.content,
      videoUrl: item.video_url,
      coverImageUrl: item.cover_image_url,
      resourceLink: item.resource_link,
      resourceFileUrl: item.resource_file_url,
      estimatedMinutes: item.estimated_minutes ?? 20,
      orderIndex: item.order_index ?? 1,
      isPublished: item.is_published ?? true,
      createdAt: item.created_at ? new Date(item.created_at) : undefined,
      updatedAt: item.updated_at ? new Date(item.updated_at) : undefined
    }));
  }

  async createLesson(lesson: CreateLessonInput): Promise<Lesson> {
    const insertRow: Record<string, unknown> = {
      course_id: lesson.courseId,
      ...(lesson.classId ? { class_id: lesson.classId } : {}),
      title: lesson.title,
      summary: lesson.summary ?? '',
      objective: lesson.objective ?? '',
      content: lesson.content ?? '',
      video_url: lesson.videoUrl ?? '',
      cover_image_url: lesson.coverImageUrl ?? '',
      resource_link: lesson.resourceLink ?? '',
      resource_file_url: lesson.resourceFileUrl ?? '',
      estimated_minutes: lesson.estimatedMinutes,
      order_index: lesson.orderIndex,
      is_published: lesson.isPublished
    };

    const { data, error } = await this.supabase
      .from('lessons')
      .insert([insertRow])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return {
      id: data.id,
      courseId: data.course_id,
      title: data.title,
      summary: data.summary,
      objective: data.objective,
      content: data.content,
      videoUrl: data.video_url,
      coverImageUrl: data.cover_image_url,
      resourceLink: data.resource_link,
      resourceFileUrl: data.resource_file_url,
      estimatedMinutes: data.estimated_minutes ?? 20,
      orderIndex: data.order_index ?? 1,
      isPublished: data.is_published ?? true,
      createdAt: data.created_at ? new Date(data.created_at) : undefined,
      updatedAt: data.updated_at ? new Date(data.updated_at) : undefined
    };
  }

  async updateLesson(lessonId: string, lesson: Partial<CreateLessonInput>): Promise<void> {
    const payload: Record<string, unknown> = {};

    if (lesson.title !== undefined) payload['title'] = lesson.title;
    if (lesson.summary !== undefined) payload['summary'] = lesson.summary;
    if (lesson.objective !== undefined) payload['objective'] = lesson.objective;
    if (lesson.content !== undefined) payload['content'] = lesson.content;
    if (lesson.videoUrl !== undefined) payload['video_url'] = lesson.videoUrl;
    if (lesson.coverImageUrl !== undefined) payload['cover_image_url'] = lesson.coverImageUrl;
    if (lesson.resourceLink !== undefined) payload['resource_link'] = lesson.resourceLink;
    if (lesson.resourceFileUrl !== undefined) payload['resource_file_url'] = lesson.resourceFileUrl;
    if (lesson.estimatedMinutes !== undefined) payload['estimated_minutes'] = lesson.estimatedMinutes;
    if (lesson.orderIndex !== undefined) payload['order_index'] = lesson.orderIndex;
    if (lesson.isPublished !== undefined) payload['is_published'] = lesson.isPublished;

    payload['updated_at'] = new Date().toISOString();

    const { error } = await this.supabase
      .from('lessons')
      .update(payload)
      .eq('id', lessonId);

    if (error) {
      throw error;
    }
  }

  async deleteLesson(lessonId: string): Promise<void> {
    const { error } = await this.supabase
      .from('lessons')
      .delete()
      .eq('id', lessonId);

    if (error) {
      throw error;
    }
  }

  async assignLessonToClass(
    lessonId: string,
    _courseId: string,
    classId: string
  ): Promise<void> {
    const { data: enrollments, error: enrollmentError } = await this.supabase
      .from('class_enrollments')
      .select('student_id, status')
      .eq('class_id', classId);

    if (enrollmentError) {
      throw enrollmentError;
    }

    const activeStudents = (enrollments || []).filter((e: any) => e.status === 'active');

    if (activeStudents.length === 0) {
      return;
    }

    const rows = activeStudents.map((item: any) => ({
      lesson_id: lessonId,
      class_id: classId,
      student_id: item.student_id,
      status: 'assigned',
      progress_percent: 0,
      is_active: true,
      assigned_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { error } = await this.supabase
      .from('student_lessons')
      .upsert(rows, {
        onConflict: 'lesson_id,class_id,student_id'
      });

    if (error) {
      throw error;
    }
  }

  async getStudentLessonsByClass(classId: string): Promise<StudentLesson[]> {
    const { data, error } = await this.supabase
      .from('student_lessons')
      .select('*')
      .eq('class_id', classId)
      .order('assigned_at', { ascending: false });

    if (error) {
      throw error;
    }

    const rows = data || [];
    const lessonIds = [...new Set(rows.map((r: any) => r.lesson_id))];
    const studentIds = [...new Set(rows.map((r: any) => r.student_id))];

    const [lessonResult, studentResult, classResult] = await Promise.all([
      lessonIds.length
        ? this.supabase
            .from('lessons')
            .select('id, title, summary, objective, content, video_url, cover_image_url, resource_link, resource_file_url')
            .in('id', lessonIds)
        : Promise.resolve({ data: [], error: null } as any),
      studentIds.length
        ? this.supabase.from('app_users').select('id, name, email').in('id', studentIds)
        : Promise.resolve({ data: [], error: null } as any),
      this.supabase.from('classes').select('id, name').eq('id', classId)
    ]);

    const lessons = lessonResult.data || [];
    const students = studentResult.data || [];
    const classes = classResult.data || [];

    return rows.map((item: any) => {
      const lesson = lessons.find((l: any) => l.id === item.lesson_id);
      const student = students.find((s: any) => s.id === item.student_id);
      const cls = classes.find((c: any) => c.id === item.class_id);

      return {
        id: item.id,
        lessonId: item.lesson_id,
        classId: item.class_id,
        studentId: item.student_id,
        status: item.status as StudentLessonStatus,
        progressPercent: item.progress_percent ?? 0,
        score: item.score ?? null,
        isActive: item.is_active ?? true,
        assignedAt: item.assigned_at ? new Date(item.assigned_at) : new Date(),
        startedAt: item.started_at ? new Date(item.started_at) : null,
        lastAccessedAt: item.last_accessed_at ? new Date(item.last_accessed_at) : null,
        completedAt: item.completed_at ? new Date(item.completed_at) : null,
        createdAt: item.created_at ? new Date(item.created_at) : undefined,
        updatedAt: item.updated_at ? new Date(item.updated_at) : undefined,
        lessonTitle: lesson?.title,
        studentName: student?.name,
        studentEmail: student?.email,
        className: cls?.name,
        summary: lesson?.summary,
        objective: lesson?.objective,
        content: lesson?.content,
        videoUrl: lesson?.video_url,
        coverImageUrl: lesson?.cover_image_url,
        resourceLink: lesson?.resource_link,
        resourceFileUrl: lesson?.resource_file_url
      };
    });
  }

  async getStudentLessonsByStudent(studentId: string): Promise<StudentLesson[]> {
    const { data, error } = await this.supabase
      .from('student_lessons')
      .select('*')
      .eq('student_id', studentId)
      .eq('is_active', true)
      .order('assigned_at', { ascending: false });

    if (error) {
      throw error;
    }

    const rows = data || [];
    const lessonIds = [...new Set(rows.map((r: any) => r.lesson_id))];
    const classIds = [...new Set(rows.map((r: any) => r.class_id))];

    const [lessonResult, classResult] = await Promise.all([
      lessonIds.length
        ? this.supabase
            .from('lessons')
            .select('id, title, summary, objective, content, video_url, cover_image_url, resource_link, resource_file_url')
            .in('id', lessonIds)
        : Promise.resolve({ data: [], error: null } as any),
      classIds.length
        ? this.supabase.from('classes').select('id, name').in('id', classIds)
        : Promise.resolve({ data: [], error: null } as any)
    ]);

    const lessons = lessonResult.data || [];
    const classes = classResult.data || [];

    return rows.map((item: any) => {
      const lesson = lessons.find((l: any) => l.id === item.lesson_id);
      const cls = classes.find((c: any) => c.id === item.class_id);

      return {
        id: item.id,
        lessonId: item.lesson_id,
        classId: item.class_id,
        studentId: item.student_id,
        status: item.status as StudentLessonStatus,
        progressPercent: item.progress_percent ?? 0,
        score: item.score ?? null,
        isActive: item.is_active ?? true,
        assignedAt: item.assigned_at ? new Date(item.assigned_at) : new Date(),
        startedAt: item.started_at ? new Date(item.started_at) : null,
        lastAccessedAt: item.last_accessed_at ? new Date(item.last_accessed_at) : null,
        completedAt: item.completed_at ? new Date(item.completed_at) : null,
        createdAt: item.created_at ? new Date(item.created_at) : undefined,
        updatedAt: item.updated_at ? new Date(item.updated_at) : undefined,
        lessonTitle: lesson?.title,
        className: cls?.name,
        summary: lesson?.summary,
        objective: lesson?.objective,
        content: lesson?.content,
        videoUrl: lesson?.video_url,
        coverImageUrl: lesson?.cover_image_url,
        resourceLink: lesson?.resource_link,
        resourceFileUrl: lesson?.resource_file_url
      };
    });
  }

  async getAppUserIdByAuthUserId(authUserId: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from('app_users')
      .select('id')
      .eq('auth_user_id', authUserId)
      .single();

    if (error) {
      return null;
    }

    return data?.id ?? null;
  }

  async updateStudentLessonStatus(
    id: string,
    status: StudentLessonStatus,
    progressPercent?: number
  ): Promise<void> {
    const payload: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString()
    };

    if (progressPercent !== undefined) {
      payload['progress_percent'] = progressPercent;
    }

    if (status === 'in_progress') {
      payload['started_at'] = new Date().toISOString();
      payload['last_accessed_at'] = new Date().toISOString();
    }

    if (status === 'completed') {
      payload['progress_percent'] = 100;
      payload['completed_at'] = new Date().toISOString();
      payload['last_accessed_at'] = new Date().toISOString();
    }

    if (status === 'assigned' && progressPercent === 0) {
      payload['started_at'] = null;
      payload['completed_at'] = null;
    }

    const { error } = await this.supabase
      .from('student_lessons')
      .update(payload)
      .eq('id', id);

    if (error) {
      throw error;
    }
  }

  async updateStudentLessonScore(id: string, score: number): Promise<void> {
    const { error } = await this.supabase
      .from('student_lessons')
      .update({
        score,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      throw error;
    }
  }

  async updateStudentLessonProgress(id: string, progressPercent: number): Promise<void> {
    const safeProgress = Math.max(0, Math.min(100, progressPercent));

    let status: StudentLessonStatus = 'assigned';

    if (safeProgress >= 100) {
      status = 'completed';
    } else if (safeProgress > 0) {
      status = 'in_progress';
    }

    await this.updateStudentLessonStatus(id, status, safeProgress);
  }

  async toggleStudentLessonActive(id: string, isActive: boolean): Promise<void> {
    const nextStatus: StudentLessonStatus = isActive ? 'assigned' : 'inactive';

    const { error } = await this.supabase
      .from('student_lessons')
      .update({
        is_active: isActive,
        status: nextStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      throw error;
    }
  }
}