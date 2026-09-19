export interface Course {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  totalDurationSec: number;
  learnerCount: number;
  chapters: Chapter[];
}

export interface Chapter {
  id: string;
  courseId: string;
  title: string;
  sortOrder: number;
  lessons: Lesson[];
}

export interface Lesson {
  id: string;
  chapterId: string;
  courseId: string;
  title: string;
  videoUrl: string;
  durationSec: number;
  sortOrder: number;
  quiz: QuizQuestion[];
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
}

export interface QuizResult {
  lessonId: string;
  courseId: string;
  lastScorePercent: number;
  bestScorePercent: number;
  passed: boolean;
  submittedAt: string;
}

export type AssignmentStatus = 'pending' | 'rejected' | 'approved';

export interface ChapterAssignment {
  userId: string;
  username: string;
  courseId: string;
  chapterId: string;
  content: string;
  status: AssignmentStatus;
  rejectReason?: string;
  submittedAt: string;
  reviewedAt?: string;
}

export interface AssignmentView extends ChapterAssignment {
  courseTitle: string;
  chapterTitle: string;
}

export interface ChapterAssignmentInfo {
  chapterId: string;
  chapterTitle: string;
  status: AssignmentStatus;
  rejectReason?: string;
  submittedAt: string;
}

export interface LearningProgress {
  lessonId: string;
  courseId: string;
  watchedSec: number;
  completed: boolean;
  lastWatchedAt: string;
}

export interface LearningRecord {
  courseId: string;
  courseTitle: string;
  courseCoverUrl: string;
  lastLessonId: string;
  lastLessonTitle: string;
  lastChapterTitle: string;
  totalLessons: number;
  completedLessons: number;
  quizPassedLessons: number;
  assignments: ChapterAssignmentInfo[];
  lastWatchedAt: string;
  progressPercent: number;
  watchedSec: number;
  totalSec: number;
}

export interface CourseListItem {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  totalDurationSec: number;
  learnerCount: number;
}

export type UserRole = 'student' | 'admin';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  createdAt: string;
}

export interface AuthResult {
  user: User;
  token: string;
}

export interface ChapterInput {
  id?: string;
  title: string;
  sortOrder: number;
  lessons: LessonInput[];
}

export interface LessonInput {
  id?: string;
  title: string;
  videoUrl: string;
  durationSec: number;
  sortOrder: number;
  quiz: QuizQuestionInput[];
}

export interface QuizQuestionInput {
  id?: string;
  question: string;
  options: string[];
  correctIndex: number;
}

export interface CourseInput {
  title: string;
  description: string;
  coverUrl: string;
  chapters: ChapterInput[];
}

export const QUIZ_PASS_PERCENT = 60;
export const WATCH_COMPLETE_RATIO = 0.9;
