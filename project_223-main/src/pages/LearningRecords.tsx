import { useQuery } from '@tanstack/react-query';
import { Empty, Progress, Tag } from 'antd';
import {
  CheckCircleFilled,
  ClockCircleFilled,
  CloseCircleFilled,
} from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { fetchLearningRecords } from '@/api/api';
import type { LearningRecord } from '@/types';
import { useAuthStore } from '@/store/useAuthStore';
import styles from './LearningRecords.module.css';

function formatRelativeTime(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffMonth = Math.floor(diffDay / 30);

  if (diffSec < 60) return '刚刚';
  if (diffMin < 60) return `${diffMin}分钟前`;
  if (diffHour < 24) return `${diffHour}小时前`;
  if (diffDay < 30) return `${diffDay}天前`;
  return `${diffMonth}个月前`;
}

function RecordCard({ record }: { record: LearningRecord }) {
  const navigate = useNavigate();

  return (
    <div
      className={styles.card}
      onClick={() => navigate(`/course/${record.courseId}`)}
    >
      <img
        className={styles.cover}
        src={record.courseCoverUrl}
        alt={record.courseTitle}
      />
      <div className={styles.info}>
        <h3 className={styles.courseTitle}>{record.courseTitle}</h3>
        <p className={styles.lastLesson}>
          最近学习：{record.lastChapterTitle} - {record.lastLessonTitle}
        </p>
        <div className={styles.progressRow}>
          <div className={styles.progressBar}>
            <Progress percent={Math.round(record.progressPercent)} size="small" />
          </div>
          <span className={styles.progressText}>
            {record.progressPercent.toFixed(1)}%
          </span>
        </div>
        <div className={styles.progressDetail}>
          <span>看完 {record.completedLessons}/{record.totalLessons} 节</span>
          <span>测验通过 {record.quizPassedLessons}/{record.totalLessons} 节</span>
          <p className={styles.time}>{formatRelativeTime(record.lastWatchedAt)}</p>
        </div>
        {record.assignments.length > 0 && (
          <div className={styles.assignmentRow}>
            {record.assignments.map((a) => (
              <span key={a.chapterId} className={styles.assignmentItem}>
                <span className={styles.assignmentChapter}>{a.chapterTitle}</span>
                {a.status === 'pending' && (
                  <Tag icon={<ClockCircleFilled />} color="processing">
                    作业待批改
                  </Tag>
                )}
                {a.status === 'rejected' && (
                  <Tag icon={<CloseCircleFilled />} color="error">
                    作业已打回{a.rejectReason ? `：${a.rejectReason}` : ''}
                  </Tag>
                )}
                {a.status === 'approved' && (
                  <Tag icon={<CheckCircleFilled />} color="success">
                    作业已通过
                  </Tag>
                )}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function LearningRecords() {
  const user = useAuthStore((s) => s.user);
  const { data: records = [] } = useQuery({
    queryKey: ['learningRecords', user?.id],
    queryFn: () => fetchLearningRecords(),
    enabled: !!user,
  });

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>我的学习</h1>

      {records.length === 0 ? (
        <div className={styles.emptyState}>
          <Empty description={false} />
          <p style={{ color: 'var(--color-text-secondary)', marginTop: 16 }}>
            还没有学习记录，去探索课程吧
          </p>
          <Link className={styles.emptyLink} to="/">
            探索课程
          </Link>
        </div>
      ) : (
        <div className={styles.grid}>
          {records.map((record) => (
            <RecordCard key={record.courseId} record={record} />
          ))}
        </div>
      )}
    </div>
  );
}
