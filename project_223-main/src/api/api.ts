import type {
  Course,
  CourseListItem,
  LearningProgress,
  LearningRecord,
  User,
  UserRole,
  CourseInput,
  QuizResult,
  ChapterAssignment,
  AssignmentView,
  ChapterAssignmentInfo,
} from '@/types';
import { QUIZ_PASS_PERCENT, WATCH_COMPLETE_RATIO } from '@/types';
import {
  getAllCourseListItems,
  getAnyCourseById,
  getAllLessons,
  registerUser as mockRegisterUser,
  loginUser as mockLoginUser,
  logoutUser as mockLogoutUser,
  getCurrentUser as mockGetCurrentUser,
  createCourse as mockCreateCourse,
  updateCourse as mockUpdateCourse,
  deleteCourse as mockDeleteCourse,
} from './mock-data';

const PROGRESS_KEY_PREFIX = 'online-classroom-progress-';
const QUIZ_KEY_PREFIX = 'online-classroom-quiz-';
const ASSIGNMENTS_KEY = 'online-classroom-assignments';

function getProgressKey(userId: string): string {
  return `${PROGRESS_KEY_PREFIX}${userId}`;
}

function getQuizKey(userId: string): string {
  return `${QUIZ_KEY_PREFIX}${userId}`;
}

function getCurrentUserId(): string | null {
  const user = mockGetCurrentUser();
  return user ? user.id : null;
}

function loadProgressMap(): Record<string, LearningProgress> {
  const userId = getCurrentUserId();
  if (!userId) return {};
  try {
    const raw = localStorage.getItem(getProgressKey(userId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveProgressMap(map: Record<string, LearningProgress>) {
  const userId = getCurrentUserId();
  if (!userId) return;
  localStorage.setItem(getProgressKey(userId), JSON.stringify(map));
}

function loadQuizMap(): Record<string, QuizResult> {
  const userId = getCurrentUserId();
  if (!userId) return {};
  try {
    const raw = localStorage.getItem(getQuizKey(userId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveQuizMap(map: Record<string, QuizResult>) {
  const userId = getCurrentUserId();
  if (!userId) return;
  localStorage.setItem(getQuizKey(userId), JSON.stringify(map));
}

function loadAllAssignments(): Record<string, ChapterAssignment> {
  try {
    const raw = localStorage.getItem(ASSIGNMENTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveAllAssignments(map: Record<string, ChapterAssignment>) {
  localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(map));
}

function assignmentKey(userId: string, courseId: string, chapterId: string): string {
  return `${userId}::${courseId}::${chapterId}`;
}

export function fetchCourseList(): CourseListItem[] {
  return getAllCourseListItems();
}

export function fetchCourseDetail(courseId: string): Course | null {
  return getAnyCourseById(courseId) ?? null;
}

export function fetchProgress(courseId: string, lessonId: string): LearningProgress | null {
  const map = loadProgressMap();
  const key = `${courseId}::${lessonId}`;
  return map[key] ?? null;
}

export function fetchCourseProgressMap(courseId: string): Record<string, LearningProgress> {
  const map = loadProgressMap();
  const result: Record<string, LearningProgress> = {};
  Object.entries(map).forEach(([key, p]) => {
    if (p.courseId === courseId) {
      result[key] = p;
    }
  });
  return result;
}

export function reportProgress(
  courseId: string,
  lessonId: string,
  watchedSec: number,
): LearningProgress {
  const map = loadProgressMap();
  const key = `${courseId}::${lessonId}`;
  const course = getAnyCourseById(courseId);
  const lesson = course ? getAllLessons(courseId).find((l) => l.id === lessonId) : undefined;
  const completed = lesson ? watchedSec / lesson.durationSec >= WATCH_COMPLETE_RATIO : false;
  const existing = map[key];
  const progress: LearningProgress = {
    lessonId,
    courseId,
    watchedSec: Math.max(watchedSec, existing?.watchedSec ?? 0),
    completed: completed || (existing?.completed ?? false),
    lastWatchedAt: new Date().toISOString(),
  };
  map[key] = progress;
  saveProgressMap(map);
  return progress;
}

export function fetchQuizResult(courseId: string, lessonId: string): QuizResult | null {
  const map = loadQuizMap();
  return map[`${courseId}::${lessonId}`] ?? null;
}

export function fetchCourseQuizMap(courseId: string): Record<string, QuizResult> {
  const map = loadQuizMap();
  const result: Record<string, QuizResult> = {};
  Object.entries(map).forEach(([key, r]) => {
    if (r.courseId === courseId) {
      result[key] = r;
    }
  });
  return result;
}

export function submitQuizResult(
  courseId: string,
  lessonId: string,
  scorePercent: number,
): QuizResult {
  const map = loadQuizMap();
  const key = `${courseId}::${lessonId}`;
  const existing = map[key];
  const result: QuizResult = {
    lessonId,
    courseId,
    lastScorePercent: scorePercent,
    bestScorePercent: Math.max(scorePercent, existing?.bestScorePercent ?? 0),
    passed: scorePercent >= QUIZ_PASS_PERCENT || (existing?.passed ?? false),
    submittedAt: new Date().toISOString(),
  };
  map[key] = result;
  saveQuizMap(map);
  return result;
}

export function submitAssignment(
  courseId: string,
  chapterId: string,
  content: string,
): ChapterAssignment | null {
  const user = mockGetCurrentUser();
  if (!user) return null;
  const map = loadAllAssignments();
  const key = assignmentKey(user.id, courseId, chapterId);
  const assignment: ChapterAssignment = {
    userId: user.id,
    username: user.username,
    courseId,
    chapterId,
    content,
    status: 'pending',
    submittedAt: new Date().toISOString(),
  };
  map[key] = assignment;
  saveAllAssignments(map);
  return assignment;
}

export function fetchMyAssignments(courseId?: string): ChapterAssignment[] {
  const user = mockGetCurrentUser();
  if (!user) return [];
  const map = loadAllAssignments();
  return Object.values(map).filter(
    (a) => a.userId === user.id && (!courseId || a.courseId === courseId),
  );
}

export function fetchAllAssignments(): AssignmentView[] {
  const map = loadAllAssignments();
  const views: AssignmentView[] = [];
  Object.values(map).forEach((a) => {
    const course = getAnyCourseById(a.courseId);
    if (!course) return;
    const chapter = course.chapters.find((ch) => ch.id === a.chapterId);
    if (!chapter) return;
    views.push({
      ...a,
      courseTitle: course.title,
      chapterTitle: chapter.title,
    });
  });
  views.sort((a, b) => {
    if ((a.status === 'pending') !== (b.status === 'pending')) {
      return a.status === 'pending' ? -1 : 1;
    }
    return b.submittedAt.localeCompare(a.submittedAt);
  });
  return views;
}

export function reviewAssignment(
  userId: string,
  courseId: string,
  chapterId: string,
  approved: boolean,
  rejectReason?: string,
): boolean {
  const map = loadAllAssignments();
  const key = assignmentKey(userId, courseId, chapterId);
  const existing = map[key];
  if (!existing) return false;
  map[key] = {
    ...existing,
    status: approved ? 'approved' : 'rejected',
    rejectReason: approved ? undefined : rejectReason,
    reviewedAt: new Date().toISOString(),
  };
  saveAllAssignments(map);
  return true;
}

function cleanupCourseLearningData(course: Course) {
  const validLessonIds = new Set(course.chapters.flatMap((ch) => ch.lessons.map((l) => l.id)));
  const validChapterIds = new Set(course.chapters.map((ch) => ch.id));

  for (let i = 0; i < localStorage.length; i++) {
    const storageKey = localStorage.key(i);
    if (!storageKey) continue;
    if (storageKey.startsWith(PROGRESS_KEY_PREFIX) || storageKey.startsWith(QUIZ_KEY_PREFIX)) {
      try {
        const map = JSON.parse(localStorage.getItem(storageKey) ?? '{}') as Record<
          string,
          { courseId: string; lessonId: string }
        >;
        let changed = false;
        Object.keys(map).forEach((key) => {
          const entry = map[key];
          if (entry.courseId === course.id && !validLessonIds.has(entry.lessonId)) {
            delete map[key];
            changed = true;
          }
        });
        if (changed) {
          localStorage.setItem(storageKey, JSON.stringify(map));
        }
      } catch {
        // ignore malformed entries
      }
    }
  }

  const assignments = loadAllAssignments();
  let assignmentsChanged = false;
  Object.keys(assignments).forEach((key) => {
    const a = assignments[key];
    if (a.courseId === course.id && !validChapterIds.has(a.chapterId)) {
      delete assignments[key];
      assignmentsChanged = true;
    }
  });
  if (assignmentsChanged) {
    saveAllAssignments(assignments);
  }
}

export function fetchLearningRecords(): LearningRecord[] {
  const map = loadProgressMap();
  const quizMap = loadQuizMap();
  const myAssignments = fetchMyAssignments();
  const courseIds = new Set<string>();
  Object.values(map).forEach((p) => courseIds.add(p.courseId));
  myAssignments.forEach((a) => courseIds.add(a.courseId));

  const records: LearningRecord[] = [];
  courseIds.forEach((cid) => {
    const course = getAnyCourseById(cid);
    if (!course) return;
    const allLessons = getAllLessons(cid);
    let latest: LearningProgress | null = null;
    let completedCount = 0;
    let quizPassedCount = 0;
    let watchedSec = 0;
    let totalSec = 0;
    for (const les of allLessons) {
      totalSec += les.durationSec;
      const p = map[`${cid}::${les.id}`];
      if (p) {
        if (!latest || p.lastWatchedAt > latest.lastWatchedAt) {
          latest = p;
        }
        if (p.completed) completedCount++;
        watchedSec += Math.min(p.watchedSec, les.durationSec);
      }
      const quiz = quizMap[`${cid}::${les.id}`];
      if (les.quiz.length > 0 ? quiz?.passed : (p?.completed ?? false)) {
        quizPassedCount++;
      }
    }
    const courseAssignments: ChapterAssignmentInfo[] = myAssignments
      .filter((a) => a.courseId === cid)
      .map((a) => {
        const chapter = course.chapters.find((ch) => ch.id === a.chapterId);
        return {
          chapterId: a.chapterId,
          chapterTitle: chapter?.title ?? '',
          status: a.status,
          rejectReason: a.rejectReason,
          submittedAt: a.submittedAt,
        };
      })
      .filter((a) => a.chapterTitle !== '')
      .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));

    const latestAssignmentAt = courseAssignments.length
      ? myAssignments
          .filter((a) => a.courseId === cid)
          .reduce((max, a) => (a.submittedAt > max ? a.submittedAt : max), '')
      : '';
    if (!latest && !latestAssignmentAt) return;
    const lastLesson = latest ? allLessons.find((l) => l.id === latest!.lessonId) : undefined;
    const lastChapter = course.chapters.find((ch) => ch.id === lastLesson?.chapterId);
    const lastWatchedAt =
      latest && latest.lastWatchedAt > latestAssignmentAt
        ? latest.lastWatchedAt
        : latestAssignmentAt || latest!.lastWatchedAt;
    records.push({
      courseId: cid,
      courseTitle: course.title,
      courseCoverUrl: course.coverUrl,
      lastLessonId: lastLesson?.id ?? '',
      lastLessonTitle: lastLesson?.title ?? '',
      lastChapterTitle: lastChapter?.title ?? '',
      totalLessons: allLessons.length,
      completedLessons: completedCount,
      quizPassedLessons: quizPassedCount,
      assignments: courseAssignments,
      lastWatchedAt,
      progressPercent: totalSec > 0 ? (watchedSec / totalSec) * 100 : 0,
      watchedSec,
      totalSec,
    });
  });

  records.sort((a, b) => b.lastWatchedAt.localeCompare(a.lastWatchedAt));
  return records;
}

export function login(username: string, password: string): User | null {
  return mockLoginUser(username, password);
}

export function register(username: string, password: string, role: UserRole = 'student'): User | null {
  return mockRegisterUser(username, password, role);
}

export function logout(): void {
  mockLogoutUser();
}

export function getCurrentUser(): User | null {
  return mockGetCurrentUser();
}

export function addCourse(input: CourseInput): Course {
  return mockCreateCourse(input);
}

export function updateCourse(courseId: string, input: CourseInput): Course | null {
  const updated = mockUpdateCourse(courseId, input);
  if (updated) {
    cleanupCourseLearningData(updated);
  }
  return updated;
}

export function removeCourse(courseId: string): boolean {
  return mockDeleteCourse(courseId);
}
