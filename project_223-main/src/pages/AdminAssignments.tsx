import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal, Tag, Empty, message } from 'antd';
import {
  CheckCircleFilled,
  ClockCircleFilled,
  CloseCircleFilled,
} from '@ant-design/icons';
import { fetchAllAssignments, reviewAssignment } from '@/api/api';
import type { AssignmentView } from '@/types';
import styles from './Admin.module.css';

function formatTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminAssignments() {
  const queryClient = useQueryClient();
  const [rejectTarget, setRejectTarget] = useState<AssignmentView | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data: assignments = [] } = useQuery({
    queryKey: ['allAssignments'],
    queryFn: fetchAllAssignments,
    refetchInterval: 3000,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['allAssignments'] });
  };

  const handleApprove = (a: AssignmentView) => {
    Modal.confirm({
      title: '通过作业',
      content: `确定通过 ${a.username} 提交的「${a.courseTitle} / ${a.chapterTitle}」作业吗？通过后该学生的下一章将解锁。`,
      okText: '通过',
      cancelText: '取消',
      onOk: () => {
        reviewAssignment(a.userId, a.courseId, a.chapterId, true);
        message.success('已通过该作业');
        refresh();
      },
    });
  };

  const handleRejectSubmit = () => {
    if (!rejectTarget) return;
    const reason = rejectReason.trim();
    if (!reason) {
      message.warning('请填写打回原因');
      return;
    }
    reviewAssignment(rejectTarget.userId, rejectTarget.courseId, rejectTarget.chapterId, false, reason);
    message.success('已打回该作业');
    setRejectTarget(null);
    setRejectReason('');
    refresh();
  };

  return (
    <div>
      {assignments.length === 0 ? (
        <div className={styles.emptyState}>
          <Empty description="暂无学生提交章节作业" />
        </div>
      ) : (
        <div className={styles.assignmentList}>
          {assignments.map((a) => (
            <div key={`${a.userId}-${a.courseId}-${a.chapterId}`} className={styles.assignmentCard}>
              <div className={styles.assignmentHeader}>
                <span className={styles.assignmentStudent}>{a.username}</span>
                <span className={styles.assignmentCourse}>
                  {a.courseTitle} / {a.chapterTitle}
                </span>
                {a.status === 'pending' && (
                  <Tag icon={<ClockCircleFilled />} color="processing">
                    待批改
                  </Tag>
                )}
                {a.status === 'approved' && (
                  <Tag icon={<CheckCircleFilled />} color="success">
                    已通过
                  </Tag>
                )}
                {a.status === 'rejected' && (
                  <Tag icon={<CloseCircleFilled />} color="error">
                    已打回
                  </Tag>
                )}
                <span className={styles.assignmentTime}>{formatTime(a.submittedAt)}</span>
              </div>
              <div className={styles.assignmentContent}>{a.content}</div>
              {a.status === 'rejected' && a.rejectReason && (
                <div className={styles.assignmentRejectReason}>打回原因：{a.rejectReason}</div>
              )}
              {a.status === 'pending' && (
                <div className={styles.assignmentActions}>
                  <button className={styles.approveButton} onClick={() => handleApprove(a)}>
                    通过
                  </button>
                  <button
                    className={styles.rejectButton}
                    onClick={() => {
                      setRejectTarget(a);
                      setRejectReason('');
                    }}
                  >
                    打回
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        title="打回作业"
        open={!!rejectTarget}
        onOk={handleRejectSubmit}
        onCancel={() => setRejectTarget(null)}
        okText="确认打回"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        {rejectTarget && (
          <div>
            <p style={{ marginBottom: 12 }}>
              打回 {rejectTarget.username} 的「{rejectTarget.courseTitle} / {rejectTarget.chapterTitle}
              」作业，请填写打回原因：
            </p>
            <textarea
              className={styles.formTextarea}
              placeholder="请输入打回原因（学生可见）"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
