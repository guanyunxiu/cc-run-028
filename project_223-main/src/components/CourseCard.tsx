import { Link } from 'react-router-dom';
import { Clock, Users } from 'lucide-react';
import styles from './CourseCard.module.css';

interface CourseCardProps {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  totalDurationSec: number;
  learnerCount: number;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export default function CourseCard({
  id,
  title,
  description,
  coverUrl,
  totalDurationSec,
  learnerCount,
}: CourseCardProps) {
  return (
    <Link to={`/course/${id}`} className={styles.link}>
      <div className={styles.card}>
        <img className={styles.cover} src={coverUrl} alt={title} />
        <div className={styles.body}>
          <h3 className={styles.title}>{title}</h3>
          <p className={styles.description}>{description}</p>
          <div className={styles.footer}>
            <span className={styles.footerItem}>
              <Clock size={14} />
              {formatDuration(totalDurationSec)}
            </span>
            <span className={styles.footerItem}>
              <Users size={14} />
              {learnerCount}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
