import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { Modal, message, Badge } from 'antd';
import { fetchCourseList, fetchCourseDetail, removeCourse, fetchAllAssignments } from '@/api/api';
import type { Course, CourseListItem } from '@/types';
import AdminCourseForm from './AdminCourseForm';
import AdminAssignments from './AdminAssignments';
import styles from './Admin.module.css';

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export default function Admin() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'courses' | 'assignments'>('courses');
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  const { data: courses = [] } = useQuery({
    queryKey: ['courseList'],
    queryFn: fetchCourseList,
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['allAssignments'],
    queryFn: fetchAllAssignments,
  });
  const pendingCount = assignments.filter((a) => a.status === 'pending').length;

  const refreshCourses = () => {
    queryClient.invalidateQueries({ queryKey: ['courseList'] });
    queryClient.invalidateQueries({ queryKey: ['course'] });
    queryClient.invalidateQueries({ queryKey: ['courseDetail'] });
    queryClient.invalidateQueries({ queryKey: ['learningRecords'] });
  };

  const openCreateModal = () => {
    setEditingCourse(null);
    setShowModal(true);
  };

  const openEditModal = (courseItem: CourseListItem) => {
    const full = fetchCourseDetail(courseItem.id);
    if (!full) {
      message.error('课程不存在');
      return;
    }
    setEditingCourse(full);
    setShowModal(true);
  };

  const handleDeleteCourse = (course: CourseListItem) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除课程「${course.title}」吗？此操作不可恢复。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        const ok = removeCourse(course.id);
        if (ok) {
          message.success('课程删除成功');
          refreshCourses();
        } else {
          message.error('无法删除内置课程');
        }
      },
    });
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === 'courses' ? styles.tabActive : ''}`}
            onClick={() => setTab('courses')}
          >
            课程管理
          </button>
          <button
            className={`${styles.tab} ${tab === 'assignments' ? styles.tabActive : ''}`}
            onClick={() => setTab('assignments')}
          >
            <Badge count={pendingCount} size="small" offset={[6, -2]}>
              作业批改
            </Badge>
          </button>
        </div>
        {tab === 'courses' && (
          <button className={styles.addButton} onClick={openCreateModal}>
            <Plus size={18} />
            新建课程
          </button>
        )}
      </div>

      {tab === 'courses' && (
        <>
          {courses.length === 0 ? (
            <div className={styles.emptyState}>
              <p>暂无课程，点击右上角创建新课程</p>
            </div>
          ) : (
            <div className={styles.courseGrid}>
              {courses.map((course) => (
                <div key={course.id} className={styles.courseCard}>
                  <img className={styles.cover} src={course.coverUrl} alt={course.title} />
                  <div className={styles.cardBody}>
                    <h3 className={styles.cardTitle}>{course.title}</h3>
                    <p className={styles.cardDesc}>{course.description}</p>
                    <div className={styles.cardMeta}>
                      <span className={styles.metaItem}>
                        {formatDuration(course.totalDurationSec)} · {course.learnerCount} 人学习
                      </span>
                      <div className={styles.cardActions}>
                        <button
                          className={styles.editButton}
                          onClick={() => openEditModal(course)}
                        >
                          <Pencil size={12} /> 编辑
                        </button>
                        <button
                          className={styles.deleteButton}
                          onClick={() => handleDeleteCourse(course)}
                        >
                          <Trash2 size={12} /> 删除
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'assignments' && <AdminAssignments />}

      <AdminCourseForm
        open={showModal}
        editingCourse={editingCourse}
        onClose={() => setShowModal(false)}
        onSaved={refreshCourses}
      />
    </div>
  );
}
