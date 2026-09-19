import { Collapse } from 'antd';
import { PlayCircleOutlined, CheckCircleFilled, LockFilled, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { Course } from '@/types';
import { useProgressStore } from '@/store/useProgressStore';
import { useAuthStore } from '@/store/useAuthStore';
import ChapterAssignmentPanel from '@/components/ChapterAssignmentPanel';
import styles from './ChapterTree.module.css';

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return `${h}h ${m}m ${s}s`;
  }
  if (m > 0) {
    return `${m}m ${s}s`;
  }
  return `${s}s`;
}

interface ChapterTreeProps {
  course: Course;
}

export default function ChapterTree({ course }: ChapterTreeProps) {
  const navigate = useNavigate();
  const progressMap = useProgressStore((s) => s.progressMap);
  const isLessonUnlocked = useProgressStore((s) => s.isLessonUnlocked);
  const isChapterUnlocked = useProgressStore((s) => s.isChapterUnlocked);
  const isLessonCleared = useProgressStore((s) => s.isLessonCleared);
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';

  const handleLessonClick = (chapterId: string, lessonId: string) => {
    if (isLessonUnlocked(course, chapterId, lessonId)) {
      navigate(`/course/${course.id}/lesson/${lessonId}`);
    }
  };

  const sortedChapters = [...course.chapters].sort((a, b) => a.sortOrder - b.sortOrder);

  const items = sortedChapters.map((chapter) => {
    const chapterUnlocked = isChapterUnlocked(course, chapter.id);
    const sortedLessons = [...chapter.lessons].sort((a, b) => a.sortOrder - b.sortOrder);
    let clearedCount = 0;
    sortedLessons.forEach((les) => {
      if (isLessonCleared(course, les)) clearedCount++;
    });

    return {
      key: chapter.id,
      label: (
        <div className={styles.chapterHeader}>
          <div className={styles.chapterTitleWrap}>
            <span className={styles.chapterTitle}>{chapter.title}</span>
            {!chapterUnlocked && <LockFilled className={styles.lockIcon} />}
          </div>
          <div className={styles.chapterProgressWrap}>
            <span className={styles.lessonBadge}>
              {clearedCount}/{chapter.lessons.length} 节
            </span>
          </div>
        </div>
      ),
      children: (
        <div>
          <ul className={styles.lessonList}>
            {sortedLessons.map((lesson) => {
              const key = `${course.id}::${lesson.id}`;
              const progress = progressMap[key];
              const cleared = isLessonCleared(course, lesson);
              const watched = progress?.completed ?? false;
              const unlocked = chapterUnlocked && isLessonUnlocked(course, chapter.id, lesson.id);
              return (
                <li
                  key={lesson.id}
                  className={`${styles.lessonItem} ${!unlocked ? styles.lessonLocked : ''}`}
                  onClick={() => handleLessonClick(chapter.id, lesson.id)}
                >
                  {cleared ? (
                    <CheckCircleFilled className={styles.completedIcon} />
                  ) : !unlocked ? (
                    <LockFilled className={styles.lockIconLesson} />
                  ) : watched ? (
                    <EyeOutlined className={styles.watchedIcon} />
                  ) : (
                    <PlayCircleOutlined className={styles.playIcon} />
                  )}
                  <span className={styles.lessonTitle}>{lesson.title}</span>
                  {watched && !cleared && (
                    <span className={styles.quizPendingTag}>已看完 · 待通过小测</span>
                  )}
                  <span className={styles.lessonDuration}>{formatDuration(lesson.durationSec)}</span>
                </li>
              );
            })}
          </ul>
          {!isAdmin && <ChapterAssignmentPanel course={course} chapter={chapter} />}
        </div>
      ),
    };
  });

  return (
    <div className={styles.chapterTree}>
      <Collapse accordion items={items} />
    </div>
  );
}
