import { useQuery } from '@tanstack/react-query';
import { fetchCourseList } from '@/api/api';
import CourseCard from '@/components/CourseCard';
import styles from './CourseList.module.css';

export default function CourseList() {
  const { data: courses = [] } = useQuery({
    queryKey: ['courseList'],
    queryFn: fetchCourseList,
  });

  return (
    <div className={styles.page}>
      <div className={styles.titleSection}>
        <h1 className={styles.title}>探索课程</h1>
      </div>
      <div className={styles.grid}>
        {courses.map((course) => (
          <CourseCard
            key={course.id}
            id={course.id}
            title={course.title}
            description={course.description}
            coverUrl={course.coverUrl}
            totalDurationSec={course.totalDurationSec}
            learnerCount={course.learnerCount}
          />
        ))}
      </div>
    </div>
  );
}
