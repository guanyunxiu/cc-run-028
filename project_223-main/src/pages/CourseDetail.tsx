import { useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Spin } from 'antd';
import { PlayCircleFilled } from '@ant-design/icons';
import { fetchCourseDetail } from '@/api/api';
import ChapterTree from '@/components/ChapterTree';
import { useProgressStore } from '@/store/useProgressStore';
import { useAuthStore } from '@/store/useAuthStore';
import styles from './CourseDetail.module.css';

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) {
    return `${h} 小时 ${m} 分钟`;
  }
  return `${m} 分钟`;
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export default function CourseDetail() {
  const { courseId } = useParams<{ courseId: string }>();
  const loadCourseProgress = useProgressStore((s) => s.loadCourseProgress);
  const progressMap = useProgressStore((s) => s.progressMap);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const { data: course, isLoading, isError } = useQuery({
    queryKey: ['courseDetail', courseId],
    queryFn: () => Promise.resolve(fetchCourseDetail(courseId!)),
    enabled: !!courseId,
  });

  useEffect(() => {
    if (course && user) {
      loadCourseProgress(course);
    }
  }, [course, user, loadCourseProgress]);

  const courseProgress = useMemo(() => {
    if (!course) return { watchedSec: 0, totalSec: 0, percentage: 0, completedLessons: 0, totalLessons: 0 };
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
          if (p.completed) completedLessons++;
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
  }, [course, progressMap]);

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingWrap}>
          <Spin size="large" />
        </div>
      </div>
    );
  }

  if (isError || !course) {
    return (
      <div className={styles.page}>
        <div className={styles.errorWrap}>课程未找到</div>
      </div>
    );
  }

  const totalLessons = course.chapters.reduce(
    (sum, ch) => sum + ch.lessons.length,
    0,
  );

  const firstLesson = course.chapters[0]?.lessons[0];

  const handleContinueLearning = () => {
    if (firstLesson) {
      navigate(`/course/${course.id}/lesson/${firstLesson.id}`);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.hero}>
          <div className={styles.coverWrap}>
            <img
              className={styles.cover}
              src={course.coverUrl}
              alt={course.title}
            />
            <div className={styles.playOverlay} onClick={handleContinueLearning}>
              <PlayCircleFilled className={styles.playIconLarge} />
              <span className={styles.playText}>开始学习</span>
            </div>
          </div>
          <div className={styles.info}>
            <h1 className={styles.title}>{course.title}</h1>
            <p className={styles.description}>{course.description}</p>
            <div className={styles.stats}>
              <div className={styles.statItem}>
                <span className={styles.statValue}>
                  {formatDuration(course.totalDurationSec)}
                </span>
                <span className={styles.statLabel}>总时长</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statValue}>
                  {course.learnerCount.toLocaleString()}
                </span>
                <span className={styles.statLabel}>学习人数</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statValue}>
                  {course.chapters.length}
                </span>
                <span className={styles.statLabel}>章节数</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statValue}>
                  {totalLessons}
                </span>
                <span className={styles.statLabel}>课时数</span>
              </div>
            </div>
            <div className={styles.progressSection}>
              <div className={styles.progressHeader}>
                <span className={styles.progressLabel}>学习进度</span>
                <span className={styles.progressPercent}>
                  {formatPercent(courseProgress.percentage)}
                </span>
              </div>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${courseProgress.percentage}%` }}
                />
              </div>
              <div className={styles.progressDetail}>
                <span>已完成 {courseProgress.completedLessons}/{courseProgress.totalLessons} 节</span>
                <span>{formatDuration(courseProgress.watchedSec)} / {formatDuration(courseProgress.totalSec)}</span>
              </div>
            </div>
          </div>
        </div>

        <section>
          <h2 className={styles.sectionTitle}>课程目录</h2>
          <ChapterTree course={course} />
        </section>
      </div>
    </div>
  );
}
