import { create } from 'zustand';
import type { LearningProgress, Course, Chapter, Lesson, QuizResult, ChapterAssignment } from '@/types';
import {
  reportProgress as apiReportProgress,
  fetchCourseProgressMap,
  fetchCourseQuizMap,
  fetchMyAssignments,
  submitQuizResult as apiSubmitQuizResult,
  submitAssignment as apiSubmitAssignment,
  getCurrentUser,
} from '@/api/api';

interface ProgressState {
  progressMap: Record<string, LearningProgress>;
  quizMap: Record<string, QuizResult>;
  assignmentMap: Record<string, ChapterAssignment>;
  getProgress: (courseId: string, lessonId: string) => LearningProgress | null;
  getQuizResult: (courseId: string, lessonId: string) => QuizResult | null;
  getAssignment: (courseId: string, chapterId: string) => ChapterAssignment | null;
  loadProgress: (courseId: string, lessonId: string) => void;
  loadCourseProgress: (course: Course) => void;
  reportProgress: (courseId: string, lessonId: string, watchedSec: number) => void;
  submitQuiz: (courseId: string, lessonId: string, scorePercent: number) => QuizResult;
  submitAssignment: (courseId: string, chapterId: string, content: string) => ChapterAssignment | null;
  reset: () => void;
  isAdmin: () => boolean;
  isLessonCleared: (course: Course, lesson: Lesson) => boolean;
  isChapterCleared: (course: Course, chapterId: string) => boolean;
  isLessonUnlocked: (course: Course, chapterId: string, lessonId: string) => boolean;
  isChapterUnlocked: (course: Course, chapterId: string) => boolean;
  getLockReason: (course: Course, chapterId: string, lessonId: string) => string | null;
  getChapterProgress: (course: Course, chapterId: string) => { completed: number; total: number; percentage: number };
  getCourseProgress: (course: Course) => { watchedSec: number; totalSec: number; percentage: number; completedLessons: number; totalLessons: number };
}

function getSortedChapters(course: Course): Chapter[] {
  return [...course.chapters].sort((a, b) => a.sortOrder - b.sortOrder);
}

function getSortedLessons(chapter: Chapter): Lesson[] {
  return [...chapter.lessons].sort((a, b) => a.sortOrder - b.sortOrder);
}

export const useProgressStore = create<ProgressState>((set, get) => ({
  progressMap: {},
  quizMap: {},
  assignmentMap: {},

  getProgress: (courseId, lessonId) => {
    const key = `${courseId}::${lessonId}`;
    return get().progressMap[key] ?? null;
  },

  getQuizResult: (courseId, lessonId) => {
    const key = `${courseId}::${lessonId}`;
    return get().quizMap[key] ?? null;
  },

  getAssignment: (courseId, chapterId) => {
    const key = `${courseId}::${chapterId}`;
    return get().assignmentMap[key] ?? null;
  },

  loadProgress: (courseId, lessonId) => {
    const map = fetchCourseProgressMap(courseId);
    const key = `${courseId}::${lessonId}`;
    const p = map[key];
    if (p) {
      set((state) => ({
        progressMap: { ...state.progressMap, [key]: p },
      }));
    }
  },

  loadCourseProgress: (course) => {
    const progressMap = fetchCourseProgressMap(course.id);
    const quizMap = fetchCourseQuizMap(course.id);
    const assignmentMap: Record<string, ChapterAssignment> = {};
    fetchMyAssignments(course.id).forEach((a) => {
      assignmentMap[`${a.courseId}::${a.chapterId}`] = a;
    });
    set((state) => ({
      progressMap: { ...state.progressMap, ...progressMap },
      quizMap: { ...state.quizMap, ...quizMap },
      assignmentMap: { ...state.assignmentMap, ...assignmentMap },
    }));
  },

  reportProgress: (courseId, lessonId, watchedSec) => {
    const updated = apiReportProgress(courseId, lessonId, watchedSec);
    const key = `${courseId}::${lessonId}`;
    set((state) => ({
      progressMap: { ...state.progressMap, [key]: updated },
    }));
  },

  submitQuiz: (courseId, lessonId, scorePercent) => {
    const result = apiSubmitQuizResult(courseId, lessonId, scorePercent);
    const key = `${courseId}::${lessonId}`;
    set((state) => ({
      quizMap: { ...state.quizMap, [key]: result },
    }));
    return result;
  },

  submitAssignment: (courseId, chapterId, content) => {
    const assignment = apiSubmitAssignment(courseId, chapterId, content);
    if (assignment) {
      const key = `${courseId}::${chapterId}`;
      set((state) => ({
        assignmentMap: { ...state.assignmentMap, [key]: assignment },
      }));
    }
    return assignment;
  },

  reset: () => {
    set({ progressMap: {}, quizMap: {}, assignmentMap: {} });
  },

  isAdmin: () => {
    return getCurrentUser()?.role === 'admin';
  },

  isLessonCleared: (course, lesson) => {
    const { progressMap, quizMap } = get();
    const key = `${course.id}::${lesson.id}`;
    if (lesson.quiz.length > 0) {
      return quizMap[key]?.passed ?? false;
    }
    return progressMap[key]?.completed ?? false;
  },

  isChapterCleared: (course, chapterId) => {
    const chapter = course.chapters.find((ch) => ch.id === chapterId);
    if (!chapter) return false;
    const lessons = getSortedLessons(chapter);
    if (lessons.length === 0) return false;
    return lessons.every((les) => get().isLessonCleared(course, les));
  },

  isLessonUnlocked: (course, chapterId, lessonId) => {
    if (get().isAdmin()) return true;
    const chapters = getSortedChapters(course);
    const chapterIdx = chapters.findIndex((ch) => ch.id === chapterId);
    if (chapterIdx === -1) return false;

    if (!get().isChapterUnlocked(course, chapterId)) return false;

    const currentChapter = chapters[chapterIdx];
    const lessons = getSortedLessons(currentChapter);
    const lessonIdx = lessons.findIndex((l) => l.id === lessonId);
    if (lessonIdx === -1) return false;

    if (lessonIdx === 0) return true;

    const prevLesson = lessons[lessonIdx - 1];
    return get().isLessonCleared(course, prevLesson);
  },

  isChapterUnlocked: (course, chapterId) => {
    if (get().isAdmin()) return true;
    const chapters = getSortedChapters(course);
    const chapterIdx = chapters.findIndex((ch) => ch.id === chapterId);
    if (chapterIdx === -1) return false;
    if (chapterIdx === 0) return true;

    const prevChapter = chapters[chapterIdx - 1];
    if (!get().isChapterCleared(course, prevChapter.id)) return false;

    const assignment = get().getAssignment(course.id, prevChapter.id);
    return assignment?.status === 'approved';
  },

  getLockReason: (course, chapterId, lessonId) => {
    if (get().isLessonUnlocked(course, chapterId, lessonId)) return null;
    const chapters = getSortedChapters(course);
    const chapterIdx = chapters.findIndex((ch) => ch.id === chapterId);
    if (chapterIdx > 0 && !get().isChapterUnlocked(course, chapterId)) {
      const prevChapter = chapters[chapterIdx - 1];
      if (!get().isChapterCleared(course, prevChapter.id)) {
        return `请先完成「${prevChapter.title}」的全部课时并通过每节小测`;
      }
      const assignment = get().getAssignment(course.id, prevChapter.id);
      if (!assignment) {
        return `请先在课程详情页提交「${prevChapter.title}」的章节作业`;
      }
      if (assignment.status === 'pending') {
        return `「${prevChapter.title}」的章节作业待管理员批改，通过后即可解锁`;
      }
      if (assignment.status === 'rejected') {
        return `「${prevChapter.title}」的章节作业被打回，请修改后重新提交`;
      }
    }
    return '请先完成前一节课的学习并通过小测';
  },

  getChapterProgress: (course, chapterId) => {
    const { progressMap } = get();
    const chapter = course.chapters.find((ch) => ch.id === chapterId);
    if (!chapter) return { completed: 0, total: 0, percentage: 0 };

    const lessons = chapter.lessons;
    const total = lessons.length;
    let completed = 0;

    lessons.forEach((les) => {
      const key = `${course.id}::${les.id}`;
      if (progressMap[key]?.completed) {
        completed++;
      }
    });

    return {
      completed,
      total,
      percentage: total > 0 ? (completed / total) * 100 : 0,
    };
  },

  getCourseProgress: (course) => {
    const { progressMap } = get();
    let watchedSec = 0;
    let totalSec = 0;
    let completedLessons = 0;
    let totalLessons = 0;

    course.chapters.forEach((ch) => {
      ch.lessons.forEach((les) => {
        totalSec += les.durationSec;
        totalLessons++;
        const key = `${course.id}::${les.id}`;
        const p = progressMap[key];
        if (p) {
          watchedSec += Math.min(p.watchedSec, les.durationSec);
          if (p.completed) {
            completedLessons++;
          }
        }
      });
    });

    return {
      watchedSec,
      totalSec,
      percentage: totalSec > 0 ? (watchedSec / totalSec) * 100 : 0,
      completedLessons,
      totalLessons,
    };
  },
}));
