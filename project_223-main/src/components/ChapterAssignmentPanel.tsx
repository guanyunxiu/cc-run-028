import { useState } from 'react';
import { message, Tag } from 'antd';
import {
  CheckCircleFilled,
  ClockCircleFilled,
  CloseCircleFilled,
  FileTextOutlined,
} from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import type { Chapter, Course } from '@/types';
import { useProgressStore } from '@/store/useProgressStore';
import styles from './ChapterAssignmentPanel.module.css';

interface ChapterAssignmentPanelProps {
  course: Course;
  chapter: Chapter;
}

export default function ChapterAssignmentPanel({ course, chapter }: ChapterAssignmentPanelProps) {
  const queryClient = useQueryClient();
  const isChapterCleared = useProgressStore((s) => s.isChapterCleared);
  const assignment = useProgressStore((s) => s.getAssignment(course.id, chapter.id));
  const submitAssignment = useProgressStore((s) => s.submitAssignment);

  const [content, setContent] = useState('');
  const [editing, setEditing] = useState(false);

  const cleared = isChapterCleared(course, chapter.id);

  const handleSubmit = () => {
    const text = content.trim();
    if (!text) {
      message.warning('请输入作业内容');
      return;
    }
    const result = submitAssignment(course.id, chapter.id, text);
    if (result) {
      message.success('作业已提交，等待管理员批改');
      setContent('');
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ['learningRecords'] });
    } else {
      message.error('提交失败，请重新登录后再试');
    }
  };

  if (!cleared) {
    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <FileTextOutlined className={styles.headerIcon} />
          <span className={styles.title}>章节作业</span>
        </div>
        <p className={styles.hint}>完成本章全部课时并通过每节小测后，即可提交章节作业。</p>
      </div>
    );
  }

  const status = assignment?.status;

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <FileTextOutlined className={styles.headerIcon} />
        <span className={styles.title}>章节作业</span>
        {status === 'pending' && (
          <Tag icon={<ClockCircleFilled />} color="processing">
            待批改
          </Tag>
        )}
        {status === 'approved' && (
          <Tag icon={<CheckCircleFilled />} color="success">
            已通过
          </Tag>
        )}
        {status === 'rejected' && (
          <Tag icon={<CloseCircleFilled />} color="error">
            已打回
          </Tag>
        )}
      </div>

      {status === 'approved' && (
        <p className={styles.approvedText}>作业已通过，本章学习完成。</p>
      )}

      {status === 'pending' && (
        <>
          <p className={styles.hint}>作业已提交，等待管理员批改。批改通过后下一章自动解锁。</p>
          <div className={styles.submittedContent}>{assignment?.content}</div>
        </>
      )}

      {status === 'rejected' && !editing && (
        <>
          <div className={styles.rejectReason}>
            打回原因：{assignment?.rejectReason || '未填写原因'}
          </div>
          <div className={styles.submittedContent}>{assignment?.content}</div>
          <button
            className={styles.submitButton}
            onClick={() => {
              setContent(assignment?.content ?? '');
              setEditing(true);
            }}
          >
            修改并重新提交
          </button>
        </>
      )}

      {(!status || (status === 'rejected' && editing)) && (
        <>
          {status === 'rejected' && (
            <div className={styles.rejectReason}>
              打回原因：{assignment?.rejectReason || '未填写原因'}
            </div>
          )}
          <p className={styles.hint}>
            本章课时已全部完成，请提交一段文字作业。管理员批改通过后，下一章才会解锁。
          </p>
          <textarea
            className={styles.textarea}
            placeholder="请输入本章的作业内容……"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
          />
          <div className={styles.actions}>
            <button className={styles.submitButton} onClick={handleSubmit}>
              {status === 'rejected' ? '重新提交' : '提交作业'}
            </button>
            {status === 'rejected' && (
              <button className={styles.cancelButton} onClick={() => setEditing(false)}>
                取消
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
