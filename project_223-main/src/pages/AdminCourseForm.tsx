import { useEffect, useRef, useState } from 'react';
import { message } from 'antd';
import { X, Upload, Image as ImageIcon, Video, ArrowUp, ArrowDown } from 'lucide-react';
import { addCourse, updateCourse } from '@/api/api';
import type { Course, CourseInput, ChapterInput, QuizQuestionInput } from '@/types';
import styles from './Admin.module.css';

const DEFAULT_VIDEO = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

interface QuizQuestionForm {
  id?: string;
  question: string;
  options: string[];
  correctIndex: number;
}

interface LessonForm {
  id?: string;
  title: string;
  videoUrl: string;
  durationSec: string;
  localVideoFile?: File | null;
  quiz: QuizQuestionForm[];
}

interface ChapterForm {
  id?: string;
  title: string;
  lessons: LessonForm[];
}

function emptyQuizQuestion(): QuizQuestionForm {
  return { question: '', options: ['', ''], correctIndex: 0 };
}

function emptyLesson(): LessonForm {
  return { title: '', videoUrl: DEFAULT_VIDEO, durationSec: '', localVideoFile: null, quiz: [emptyQuizQuestion()] };
}

function emptyChapter(): ChapterForm {
  return { title: '', lessons: [emptyLesson()] };
}

function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      resolve(Math.floor(video.duration));
    };
    video.onerror = reject;
    video.src = URL.createObjectURL(file);
  });
}

interface AdminCourseFormProps {
  open: boolean;
  editingCourse: Course | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function AdminCourseForm({ open, editingCourse, onClose, onSaved }: AdminCourseFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string>('');
  const [chapters, setChapters] = useState<ChapterForm[]>([emptyChapter()]);
  const [submitting, setSubmitting] = useState(false);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const videoInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (!open) return;
    if (editingCourse) {
      setTitle(editingCourse.title);
      setDescription(editingCourse.description);
      setCoverUrl(editingCourse.coverUrl);
      setCoverFile(null);
      setCoverPreview(editingCourse.coverUrl);
      const sortedChapters = [...editingCourse.chapters].sort((a, b) => a.sortOrder - b.sortOrder);
      setChapters(
        sortedChapters.map((ch) => ({
          id: ch.id,
          title: ch.title,
          lessons: [...ch.lessons]
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((les) => ({
              id: les.id,
              title: les.title,
              videoUrl: les.videoUrl,
              durationSec: String(les.durationSec),
              localVideoFile: null,
              quiz: les.quiz.map((q) => ({
                id: q.id,
                question: q.question,
                options: [...q.options],
                correctIndex: q.correctIndex,
              })),
            })),
        })),
      );
    } else {
      setTitle('');
      setDescription('');
      setCoverUrl('');
      setCoverFile(null);
      setCoverPreview('');
      setChapters([emptyChapter()]);
    }
    setSubmitting(false);
  }, [open, editingCourse]);

  if (!open) return null;

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      message.error('请选择图片文件');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      message.error('图片大小不能超过 5MB');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setCoverFile(file);
    setCoverPreview(objectUrl);
    setCoverUrl(objectUrl);
  };

  const handleVideoUpload = async (chIdx: number, lesIdx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      message.error('请选择视频文件');
      return;
    }

    try {
      const objectUrl = URL.createObjectURL(file);
      const duration = await getVideoDuration(file);

      const updated = [...chapters];
      updated[chIdx].lessons[lesIdx].videoUrl = objectUrl;
      updated[chIdx].lessons[lesIdx].durationSec = String(duration);
      updated[chIdx].lessons[lesIdx].localVideoFile = file;
      setChapters(updated);

      message.success(`视频上传成功，时长 ${formatDuration(duration)}`);
    } catch {
      message.error('视频读取失败');
    }
  };

  const addChapter = () => {
    setChapters([...chapters, emptyChapter()]);
  };

  const removeChapter = (idx: number) => {
    if (chapters.length <= 1) return;
    setChapters(chapters.filter((_, i) => i !== idx));
  };

  const moveChapter = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= chapters.length) return;
    const updated = [...chapters];
    [updated[idx], updated[target]] = [updated[target], updated[idx]];
    setChapters(updated);
  };

  const updateChapter = (idx: number, field: 'title', value: string) => {
    const updated = [...chapters];
    updated[idx] = { ...updated[idx], [field]: value };
    setChapters(updated);
  };

  const addLesson = (chIdx: number) => {
    const updated = [...chapters];
    updated[chIdx].lessons.push(emptyLesson());
    setChapters(updated);
  };

  const insertLessonAfter = (chIdx: number, lesIdx: number) => {
    const updated = [...chapters];
    updated[chIdx].lessons.splice(lesIdx + 1, 0, emptyLesson());
    setChapters(updated);
  };

  const removeLesson = (chIdx: number, lesIdx: number) => {
    const updated = [...chapters];
    if (updated[chIdx].lessons.length <= 1) return;
    updated[chIdx].lessons = updated[chIdx].lessons.filter((_, i) => i !== lesIdx);
    setChapters(updated);
  };

  const moveLesson = (chIdx: number, lesIdx: number, dir: -1 | 1) => {
    const updated = [...chapters];
    const lessons = updated[chIdx].lessons;
    const target = lesIdx + dir;
    if (target < 0 || target >= lessons.length) return;
    [lessons[lesIdx], lessons[target]] = [lessons[target], lessons[lesIdx]];
    setChapters(updated);
  };

  const updateLesson = (chIdx: number, lesIdx: number, field: 'title' | 'videoUrl' | 'durationSec', value: string) => {
    const updated = [...chapters];
    updated[chIdx].lessons[lesIdx] = { ...updated[chIdx].lessons[lesIdx], [field]: value };
    setChapters(updated);
  };

  const updateQuiz = (chIdx: number, lesIdx: number, mutate: (quiz: QuizQuestionForm[]) => void) => {
    const updated = [...chapters];
    mutate(updated[chIdx].lessons[lesIdx].quiz);
    setChapters(updated);
  };

  const addQuizQuestion = (chIdx: number, lesIdx: number) => {
    updateQuiz(chIdx, lesIdx, (quiz) => quiz.push(emptyQuizQuestion()));
  };

  const removeQuizQuestion = (chIdx: number, lesIdx: number, qIdx: number) => {
    updateQuiz(chIdx, lesIdx, (quiz) => {
      quiz.splice(qIdx, 1);
    });
  };

  const setQuizQuestionText = (chIdx: number, lesIdx: number, qIdx: number, value: string) => {
    updateQuiz(chIdx, lesIdx, (quiz) => {
      quiz[qIdx].question = value;
    });
  };

  const setQuizOption = (chIdx: number, lesIdx: number, qIdx: number, optIdx: number, value: string) => {
    updateQuiz(chIdx, lesIdx, (quiz) => {
      quiz[qIdx].options[optIdx] = value;
    });
  };

  const addQuizOption = (chIdx: number, lesIdx: number, qIdx: number) => {
    updateQuiz(chIdx, lesIdx, (quiz) => {
      if (quiz[qIdx].options.length < 6) {
        quiz[qIdx].options.push('');
      }
    });
  };

  const removeQuizOption = (chIdx: number, lesIdx: number, qIdx: number, optIdx: number) => {
    updateQuiz(chIdx, lesIdx, (quiz) => {
      const q = quiz[qIdx];
      if (q.options.length <= 2) return;
      q.options.splice(optIdx, 1);
      if (q.correctIndex === optIdx) {
        q.correctIndex = 0;
      } else if (q.correctIndex > optIdx) {
        q.correctIndex -= 1;
      }
    });
  };

  const setQuizCorrect = (chIdx: number, lesIdx: number, qIdx: number, optIdx: number) => {
    updateQuiz(chIdx, lesIdx, (quiz) => {
      quiz[qIdx].correctIndex = optIdx;
    });
  };

  const normalizeQuiz = (quiz: QuizQuestionForm[]): QuizQuestionInput[] => {
    return quiz.map((q) => {
      const kept = q.options
        .map((opt, idx) => ({ opt: opt.trim(), idx }))
        .filter((item) => item.opt !== '');
      const correctIndex = kept.findIndex((item) => item.idx === q.correctIndex);
      return {
        id: q.id,
        question: q.question.trim(),
        options: kept.map((item) => item.opt),
        correctIndex,
      };
    });
  };

  const validate = (): boolean => {
    if (!title.trim()) {
      message.error('请输入课程标题');
      return false;
    }
    if (!description.trim()) {
      message.error('请输入课程描述');
      return false;
    }
    if (!coverUrl.trim()) {
      message.error('请上传或输入课程封面');
      return false;
    }

    for (let ci = 0; ci < chapters.length; ci++) {
      const ch = chapters[ci];
      if (!ch.title.trim()) {
        message.error(`请输入第 ${ci + 1} 章标题`);
        return false;
      }
      for (let li = 0; li < ch.lessons.length; li++) {
        const les = ch.lessons[li];
        const where = `第 ${ci + 1} 章 第 ${li + 1} 节`;
        if (!les.title.trim()) {
          message.error(`${where}请输入标题`);
          return false;
        }
        if (!les.videoUrl.trim()) {
          message.error(`${where}请上传视频或输入视频地址`);
          return false;
        }
        const dur = parseInt(les.durationSec, 10);
        if (!dur || dur <= 0) {
          message.error(`${where}请输入有效的视频时长`);
          return false;
        }
        const quiz = normalizeQuiz(les.quiz);
        for (let qi = 0; qi < quiz.length; qi++) {
          const q = quiz[qi];
          if (!q.question) {
            message.error(`${where}第 ${qi + 1} 题请输入题干`);
            return false;
          }
          if (q.options.length < 2) {
            message.error(`${where}第 ${qi + 1} 题至少需要 2 个选项`);
            return false;
          }
          if (q.correctIndex < 0) {
            message.error(`${where}第 ${qi + 1} 题请选择一个正确答案`);
            return false;
          }
        }
      }
    }
    return true;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    setSubmitting(true);

    const courseChapters: ChapterInput[] = chapters.map((ch, chIdx) => ({
      id: ch.id,
      title: ch.title.trim(),
      sortOrder: chIdx + 1,
      lessons: ch.lessons.map((les, lesIdx) => ({
        id: les.id,
        title: les.title.trim(),
        videoUrl: les.videoUrl,
        durationSec: parseInt(les.durationSec, 10),
        sortOrder: lesIdx + 1,
        quiz: normalizeQuiz(les.quiz),
      })),
    }));

    const input: CourseInput = {
      title: title.trim(),
      description: description.trim(),
      coverUrl,
      chapters: courseChapters,
    };

    setTimeout(() => {
      if (editingCourse) {
        const updated = updateCourse(editingCourse.id, input);
        if (updated) {
          message.success('课程已保存');
        } else {
          message.error('保存失败，课程不存在');
        }
      } else {
        addCourse(input);
        message.success('课程创建成功');
      }
      setSubmitting(false);
      onSaved();
      onClose();
    }, 300);
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{editingCourse ? '编辑课程' : '新建课程'}</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>课程标题</label>
            <input
              className={styles.formInput}
              type="text"
              placeholder="请输入课程标题"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>课程描述</label>
            <textarea
              className={styles.formTextarea}
              placeholder="请输入课程描述"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>课程封面</label>
            <div className={styles.coverUploadArea}>
              {coverPreview ? (
                <div className={styles.coverPreview}>
                  <img src={coverPreview} alt="封面预览" />
                  <button
                    className={styles.removeCoverButton}
                    onClick={() => {
                      setCoverPreview('');
                      setCoverFile(null);
                      setCoverUrl('');
                      if (coverInputRef.current) coverInputRef.current.value = '';
                    }}
                  >
                    <X size={14} /> 移除
                  </button>
                </div>
              ) : (
                <div
                  className={styles.uploadPlaceholder}
                  onClick={() => coverInputRef.current?.click()}
                >
                  <ImageIcon size={32} className={styles.uploadIcon} />
                  <p>点击上传封面图片</p>
                  <span>支持 JPG、PNG 格式，不超过 5MB</span>
                </div>
              )}
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleCoverUpload}
              />
            </div>
            <div className={styles.orDivider}>或输入图片 URL</div>
            <input
              className={styles.formInput}
              type="text"
              placeholder="请输入封面图片 URL"
              value={coverFile ? '' : coverUrl}
              onChange={(e) => {
                setCoverUrl(e.target.value);
                setCoverPreview(e.target.value);
              }}
              disabled={!!coverFile}
            />
          </div>

          <div className={styles.chapterSection}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>章节与课时</h3>
              <button className={styles.addChapterButton} onClick={addChapter}>
                + 添加章节
              </button>
            </div>

            {chapters.map((chapter, chIdx) => (
              <div key={chIdx} className={styles.chapterBlock}>
                <div className={styles.chapterHeader}>
                  <span className={styles.chapterIndex}>第 {chIdx + 1} 章</span>
                  <div className={styles.chapterActions}>
                    <button
                      className={styles.moveButton}
                      disabled={chIdx === 0}
                      onClick={() => moveChapter(chIdx, -1)}
                      title="上移章节"
                    >
                      <ArrowUp size={13} />
                    </button>
                    <button
                      className={styles.moveButton}
                      disabled={chIdx === chapters.length - 1}
                      onClick={() => moveChapter(chIdx, 1)}
                      title="下移章节"
                    >
                      <ArrowDown size={13} />
                    </button>
                    {chapters.length > 1 && (
                      <button
                        className={styles.removeChapterButton}
                        onClick={() => removeChapter(chIdx)}
                      >
                        删除章节
                      </button>
                    )}
                  </div>
                </div>

                <div className={styles.formGroup} style={{ marginBottom: 12 }}>
                  <input
                    className={styles.formInput}
                    type="text"
                    placeholder="章节标题"
                    value={chapter.title}
                    onChange={(e) => updateChapter(chIdx, 'title', e.target.value)}
                  />
                </div>

                <div className={styles.lessonList}>
                  {chapter.lessons.map((lesson, lesIdx) => (
                    <div key={lesIdx} className={styles.lessonBlock}>
                      <div className={styles.lessonHeader}>
                        <span className={styles.lessonIndex}>第 {lesIdx + 1} 节</span>
                        <div className={styles.lessonActions}>
                          <button
                            className={styles.moveButton}
                            disabled={lesIdx === 0}
                            onClick={() => moveLesson(chIdx, lesIdx, -1)}
                            title="上移课时"
                          >
                            <ArrowUp size={12} />
                          </button>
                          <button
                            className={styles.moveButton}
                            disabled={lesIdx === chapter.lessons.length - 1}
                            onClick={() => moveLesson(chIdx, lesIdx, 1)}
                            title="下移课时"
                          >
                            <ArrowDown size={12} />
                          </button>
                          <button
                            className={styles.insertLessonButton}
                            onClick={() => insertLessonAfter(chIdx, lesIdx)}
                          >
                            在下方插入
                          </button>
                          {chapter.lessons.length > 1 && (
                            <button
                              className={styles.removeLessonButton}
                              onClick={() => removeLesson(chIdx, lesIdx)}
                            >
                              删除
                            </button>
                          )}
                        </div>
                      </div>
                      <div className={styles.formGroup} style={{ marginBottom: 10 }}>
                        <input
                          className={styles.formInput}
                          type="text"
                          placeholder="课时标题"
                          value={lesson.title}
                          onChange={(e) => updateLesson(chIdx, lesIdx, 'title', e.target.value)}
                        />
                      </div>
                      <div className={styles.videoUploadRow}>
                        <div
                          className={styles.videoUploadBtn}
                          onClick={() => {
                            const key = `${chIdx}-${lesIdx}`;
                            videoInputRefs.current[key]?.click();
                          }}
                        >
                          <Video size={16} />
                          <span>{lesson.localVideoFile ? '重新上传视频' : '上传本地视频'}</span>
                        </div>
                        <input
                          ref={(el) => {
                            const key = `${chIdx}-${lesIdx}`;
                            videoInputRefs.current[key] = el;
                          }}
                          type="file"
                          accept="video/*"
                          style={{ display: 'none' }}
                          onChange={(e) => handleVideoUpload(chIdx, lesIdx, e)}
                        />
                        <input
                          className={`${styles.formInput} ${styles.videoUrlInput}`}
                          type="text"
                          placeholder="或输入视频地址 URL"
                          value={lesson.videoUrl}
                          onChange={(e) => updateLesson(chIdx, lesIdx, 'videoUrl', e.target.value)}
                        />
                      </div>
                      <input
                        className={styles.formInput}
                        type="number"
                        placeholder="视频时长(秒)"
                        value={lesson.durationSec}
                        onChange={(e) => updateLesson(chIdx, lesIdx, 'durationSec', e.target.value)}
                        style={{ marginTop: 10 }}
                      />
                      {lesson.localVideoFile && (
                        <div className={styles.uploadedFileInfo}>
                          <Upload size={12} />
                          <span>{lesson.localVideoFile.name}</span>
                        </div>
                      )}

                      <div className={styles.quizSection}>
                        <div className={styles.quizHeader}>
                          <span className={styles.quizTitle}>
                            课时小测（{lesson.quiz.length} 题）
                          </span>
                          <button
                            className={styles.addQuizButton}
                            onClick={() => addQuizQuestion(chIdx, lesIdx)}
                          >
                            + 添加题目
                          </button>
                        </div>
                        {lesson.quiz.length === 0 && (
                          <p className={styles.quizEmpty}>未出题时，学生看完 90% 即视为通过本节。</p>
                        )}
                        {lesson.quiz.map((q, qIdx) => (
                          <div key={qIdx} className={styles.quizBlock}>
                            <div className={styles.quizBlockHeader}>
                              <span className={styles.quizIndex}>第 {qIdx + 1} 题（单选）</span>
                              <button
                                className={styles.removeLessonButton}
                                onClick={() => removeQuizQuestion(chIdx, lesIdx, qIdx)}
                              >
                                删除题目
                              </button>
                            </div>
                            <input
                              className={styles.formInput}
                              type="text"
                              placeholder="请输入题干"
                              value={q.question}
                              onChange={(e) => setQuizQuestionText(chIdx, lesIdx, qIdx, e.target.value)}
                              style={{ marginBottom: 8 }}
                            />
                            {q.options.map((opt, optIdx) => (
                              <div key={optIdx} className={styles.quizOptionRow}>
                                <label className={styles.quizCorrectLabel} title="设为正确答案">
                                  <input
                                    type="radio"
                                    name={`correct-${chIdx}-${lesIdx}-${qIdx}`}
                                    checked={q.correctIndex === optIdx}
                                    onChange={() => setQuizCorrect(chIdx, lesIdx, qIdx, optIdx)}
                                  />
                                  <span className={styles.quizCorrectText}>正确</span>
                                </label>
                                <input
                                  className={styles.formInput}
                                  type="text"
                                  placeholder={`选项 ${String.fromCharCode(65 + optIdx)}`}
                                  value={opt}
                                  onChange={(e) => setQuizOption(chIdx, lesIdx, qIdx, optIdx, e.target.value)}
                                />
                                {q.options.length > 2 && (
                                  <button
                                    className={styles.removeOptionButton}
                                    onClick={() => removeQuizOption(chIdx, lesIdx, qIdx, optIdx)}
                                  >
                                    <X size={12} />
                                  </button>
                                )}
                              </div>
                            ))}
                            {q.options.length < 6 && (
                              <button
                                className={styles.addOptionButton}
                                onClick={() => addQuizOption(chIdx, lesIdx, qIdx)}
                              >
                                + 添加选项
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <button
                    className={styles.addLessonButton}
                    onClick={() => addLesson(chIdx)}
                  >
                    + 添加课时
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.cancelButton} onClick={onClose}>
            取消
          </button>
          <button
            className={styles.submitButton}
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? '保存中...' : editingCourse ? '保存修改' : '创建课程'}
          </button>
        </div>
      </div>
    </div>
  );
}
