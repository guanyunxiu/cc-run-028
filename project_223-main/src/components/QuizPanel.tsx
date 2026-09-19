import { useMemo, useState } from 'react';
import { message, Radio, Tag } from 'antd';
import { CheckCircleFilled, LockFilled, ReloadOutlined } from '@ant-design/icons';
import type { Course, Lesson } from '@/types';
import { QUIZ_PASS_PERCENT, WATCH_COMPLETE_RATIO } from '@/types';
import { useProgressStore } from '@/store/useProgressStore';
import styles from './QuizPanel.module.css';

interface QuizPanelProps {
  course: Course;
  lesson: Lesson;
  watchedSec: number;
}

export default function QuizPanel({ course, lesson, watchedSec }: QuizPanelProps) {
  const quizResult = useProgressStore((s) => s.getQuizResult(course.id, lesson.id));
  const submitQuiz = useProgressStore((s) => s.submitQuiz);

  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [retaking, setRetaking] = useState(false);

  const requiredSec = Math.floor(lesson.durationSec * WATCH_COMPLETE_RATIO);
  const watchedEnough = watchedSec >= requiredSec;
  const allAnswered = lesson.quiz.every((q) => answers[q.id] !== undefined);

  const correctCount = useMemo(() => {
    return lesson.quiz.filter((q) => answers[q.id] === q.correctIndex).length;
  }, [answers, lesson.quiz]);

  if (lesson.quiz.length === 0) {
    return null;
  }

  const handleSubmit = () => {
    if (!watchedEnough) {
      message.warning(`需要观看满 ${Math.round(WATCH_COMPLETE_RATIO * 100)}% 课时后才能交卷`);
      return;
    }
    if (!allAnswered) {
      message.warning('请完成所有题目后再交卷');
      return;
    }
    const scorePercent = Math.round((correctCount / lesson.quiz.length) * 100);
    const result = submitQuiz(course.id, lesson.id, scorePercent);
    setRetaking(false);
    if (result.passed) {
      message.success(`测验通过！得分 ${scorePercent} 分，下一节已解锁`);
    } else {
      message.error(`得分 ${scorePercent} 分，未达到 ${QUIZ_PASS_PERCENT} 分及格线，请再试一次`);
    }
  };

  const handleRetake = () => {
    setAnswers({});
    setRetaking(true);
  };

  const showResult = quizResult && !retaking;

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3 className={styles.title}>课时小测</h3>
        <span className={styles.subtitle}>
          共 {lesson.quiz.length} 题 · 及格线 {QUIZ_PASS_PERCENT} 分
        </span>
        {quizResult?.passed && (
          <Tag icon={<CheckCircleFilled />} color="success" className={styles.passedTag}>
            已通过（最高分 {quizResult.bestScorePercent} 分）
          </Tag>
        )}
      </div>

      {!watchedEnough && (
        <div className={styles.watchHint}>
          <LockFilled />
          <span>
            需观看满 {Math.round(WATCH_COMPLETE_RATIO * 100)}%（{formatSec(requiredSec)}
            ）才能交卷，当前已观看 {formatSec(Math.min(Math.floor(watchedSec), lesson.durationSec))}
          </span>
        </div>
      )}

      {showResult && !quizResult.passed && (
        <>
          <div className={styles.resultFail}>
            本次得分 {quizResult.lastScorePercent} 分，未达到及格线 {QUIZ_PASS_PERCENT} 分。可以重新作答，下一节将在通过后解锁。
          </div>
          <div className={styles.actions}>
            <button className={styles.retakeButton} onClick={handleRetake}>
              <ReloadOutlined /> 重新作答
            </button>
          </div>
        </>
      )}

      {showResult && quizResult.passed && (
        <div className={styles.resultPass}>
          <CheckCircleFilled /> 测验已通过，最高分 {quizResult.bestScorePercent} 分。
        </div>
      )}

      {(!showResult || retaking) && (
        <>
          <div className={styles.questionList}>
            {lesson.quiz.map((q, qIdx) => (
              <div key={q.id} className={styles.question}>
                <div className={styles.questionTitle}>
                  {qIdx + 1}. {q.question}
                </div>
                <Radio.Group
                  className={styles.options}
                  value={answers[q.id]}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                >
                  {q.options.map((opt, optIdx) => (
                    <Radio key={optIdx} value={optIdx} className={styles.option}>
                      {String.fromCharCode(65 + optIdx)}. {opt}
                    </Radio>
                  ))}
                </Radio.Group>
              </div>
            ))}
          </div>
          <div className={styles.actions}>
            <button
              className={styles.submitButton}
              disabled={!watchedEnough || !allAnswered}
              onClick={handleSubmit}
            >
              交卷
            </button>
            {retaking && (
              <button className={styles.cancelRetake} onClick={() => setRetaking(false)}>
                取消
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function formatSec(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s} 秒`;
  return `${m} 分 ${s} 秒`;
}
