/* eslint-disable */
// 端到端逻辑测试：小测 -> 作业 -> 课程编辑（插入/删除/调序）
// 运行方式见 package 脚本或 README 说明
class LocalStorageMock {
  private store = new Map<string, string>();
  get length() { return this.store.size; }
  key(i: number) { return Array.from(this.store.keys())[i] ?? null; }
  getItem(k: string) { return this.store.has(k) ? this.store.get(k)! : null; }
  setItem(k: string, v: string) { this.store.set(k, String(v)); }
  removeItem(k: string) { this.store.delete(k); }
  clear() { this.store.clear(); }
}
(globalThis as any).localStorage = new LocalStorageMock();

import { useProgressStore } from '@/store/useProgressStore';
import {
  login,
  logout,
  fetchCourseDetail,
  reportProgress,
  submitQuizResult,
  submitAssignment,
  reviewAssignment,
  fetchLearningRecords,
  fetchAllAssignments,
  updateCourse,
  addCourse,
  fetchProgress,
  fetchQuizResult,
} from '@/api/api';
import type { CourseInput } from '@/types';

let failures = 0;
function check(name: string, cond: boolean) {
  if (cond) {
    console.log(`  ✓ ${name}`);
  } else {
    failures++;
    console.log(`  ✗ ${name}`);
  }
}

function toInput(course: NonNullable<ReturnType<typeof fetchCourseDetail>>): CourseInput {
  return {
    title: course.title,
    description: course.description,
    coverUrl: course.coverUrl,
    chapters: [...course.chapters]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((ch) => ({
        id: ch.id,
        title: ch.title,
        sortOrder: ch.sortOrder,
        lessons: [...ch.lessons]
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((l) => ({
            id: l.id,
            title: l.title,
            videoUrl: l.videoUrl,
            durationSec: l.durationSec,
            sortOrder: l.sortOrder,
            quiz: l.quiz.map((q) => ({ id: q.id, question: q.question, options: q.options, correctIndex: q.correctIndex })),
          })),
      })),
  };
}

const store = useProgressStore;

console.log('== 1. 学生登录，初始锁定状态 ==');
login('student', 'student123');
let course = fetchCourseDetail('course-1')!;
store.getState().loadCourseProgress(course);
check('第1节解锁', store.getState().isLessonUnlocked(course, 'ch-1-1', 'les-1-1-1'));
check('第2节初始锁定', !store.getState().isLessonUnlocked(course, 'ch-1-1', 'les-1-1-2'));
check('第2章初始锁定', !store.getState().isChapterUnlocked(course, 'ch-1-2'));

console.log('== 2. 看完90%但未过测验，下一节仍锁定 ==');
reportProgress('course-1', 'les-1-1-1', 1800);
store.getState().loadCourseProgress(course);
check('第1节已看完(completed)', fetchProgress('course-1', 'les-1-1-1')?.completed === true);
check('看完但未过测验，第2节仍锁定', !store.getState().isLessonUnlocked(course, 'ch-1-1', 'les-1-1-2'));
check('第1节未算cleared', !store.getState().isLessonCleared(course, course.chapters[0].lessons[0]));

console.log('== 3. 测验不及格 -> 仍锁；及格 -> 解锁 ==');
submitQuizResult('course-1', 'les-1-1-1', 50);
store.getState().loadCourseProgress(course);
check('50分不及格，第2节仍锁定', !store.getState().isLessonUnlocked(course, 'ch-1-1', 'les-1-1-2'));
check('不及格记录passed=false', fetchQuizResult('course-1', 'les-1-1-1')?.passed === false);
submitQuizResult('course-1', 'les-1-1-1', 100);
store.getState().loadCourseProgress(course);
check('100分及格，第2节解锁', store.getState().isLessonUnlocked(course, 'ch-1-1', 'les-1-1-2'));
check('及格后passed=true且刷新仍在', fetchQuizResult('course-1', 'les-1-1-1')?.passed === true);

console.log('== 4. 完成第1章全部小测，第2章仍锁（需作业） ==');
for (const les of ['les-1-1-2', 'les-1-1-3']) {
  reportProgress('course-1', les, 99999);
  submitQuizResult('course-1', les, 80);
}
store.getState().loadCourseProgress(course);
check('第1章已cleared', store.getState().isChapterCleared(course, 'ch-1-1'));
check('未交作业，第2章仍锁定', !store.getState().isChapterUnlocked(course, 'ch-1-2'));
check('已学完的课还能再看(第3节仍解锁)', store.getState().isLessonUnlocked(course, 'ch-1-1', 'les-1-1-3'));

console.log('== 5. 交作业 -> 待批改 -> 打回 -> 重交 -> 通过 ==');
submitAssignment('course-1', 'ch-1-1', '第一章作业内容');
store.getState().loadCourseProgress(course);
check('作业状态待批改', store.getState().getAssignment('course-1', 'ch-1-1')?.status === 'pending');
check('待批改时第2章仍锁定', !store.getState().isChapterUnlocked(course, 'ch-1-2'));
check('管理员能看到待批改作业', fetchAllAssignments().some((a) => a.chapterId === 'ch-1-1' && a.status === 'pending'));
reviewAssignment('user-student', 'course-1', 'ch-1-1', false, '内容太简单');
store.getState().loadCourseProgress(course);
check('打回后状态rejected且有原因', store.getState().getAssignment('course-1', 'ch-1-1')?.rejectReason === '内容太简单');
check('打回后第2章仍锁定', !store.getState().isChapterUnlocked(course, 'ch-1-2'));
submitAssignment('course-1', 'ch-1-1', '修改后的作业内容');
reviewAssignment('user-student', 'course-1', 'ch-1-1', true);
store.getState().loadCourseProgress(course);
check('通过后状态approved', store.getState().getAssignment('course-1', 'ch-1-1')?.status === 'approved');
check('通过后第2章解锁', store.getState().isChapterUnlocked(course, 'ch-1-2'));
check('第2章第1节解锁', store.getState().isLessonUnlocked(course, 'ch-1-2', 'les-1-2-1'));
check('第2章第2节仍锁定', !store.getState().isLessonUnlocked(course, 'ch-1-2', 'les-1-2-2'));

console.log('== 6. 学习记录区分看完/测验通过，含作业状态 ==');
let records = fetchLearningRecords();
let rec = records.find((r) => r.courseId === 'course-1')!;
check('记录：看完3节', rec.completedLessons === 3);
check('记录：测验通过3节', rec.quizPassedLessons === 3);
check('记录：含已通过的作业', rec.assignments.some((a) => a.chapterId === 'ch-1-1' && a.status === 'approved'));

console.log('== 7. 管理员编辑课程：中间插入新课 ==');
logout();
login('admin', 'admin123');
let input = toInput(fetchCourseDetail('course-1')!);
input.chapters[0].lessons.splice(2, 0, {
  title: '插入的新课',
  videoUrl: 'https://example.com/new.mp4',
  durationSec: 600,
  sortOrder: 0,
  quiz: [{ question: '1+1=?', options: ['2', '3'], correctIndex: 0 }],
});
updateCourse('course-1', input);
logout();
login('student', 'student123');
course = fetchCourseDetail('course-1')!;
store.getState().reset();
store.getState().loadCourseProgress(course);
const ch1 = course.chapters.find((c) => c.id === 'ch-1-1')!;
check('插入后第1章有4节', ch1.lessons.length === 4);
const inserted = ch1.lessons.find((l) => l.title === '插入的新课')!;
check('新课排在第3位', [...ch1.lessons].sort((a, b) => a.sortOrder - b.sortOrder)[2].id === inserted.id);
check('已学完的第1节进度没丢', fetchProgress('course-1', 'les-1-1-1')?.completed === true);
check('已及格的小测没丢', fetchQuizResult('course-1', 'les-1-1-1')?.passed === true);
check('插入的新课已解锁(前一节已过)', store.getState().isLessonUnlocked(course, 'ch-1-1', inserted.id));
check('原第3节被重新锁上', !store.getState().isLessonUnlocked(course, 'ch-1-1', 'les-1-1-3'));
check('第2章因第1章未重新cleared而锁定', !store.getState().isChapterUnlocked(course, 'ch-1-2'));

console.log('== 8. 学完插入的新课后，原第3节恢复解锁 ==');
reportProgress('course-1', inserted.id, 600);
submitQuizResult('course-1', inserted.id, 100);
store.getState().loadCourseProgress(course);
check('新课小测及格后原第3节解锁', store.getState().isLessonUnlocked(course, 'ch-1-1', 'les-1-1-3'));
check('第1章重新cleared', store.getState().isChapterCleared(course, 'ch-1-1'));
check('作业仍approved，第2章恢复解锁', store.getState().isChapterUnlocked(course, 'ch-1-2'));

console.log('== 9. 删除一节未学完的课 ==');
logout();
login('admin', 'admin123');
// 先让学生看一点 les-1-2-1（不完成）
logout();
login('student', 'student123');
reportProgress('course-1', 'les-1-2-1', 100);
logout();
login('admin', 'admin123');
input = toInput(fetchCourseDetail('course-1')!);
input.chapters[1].lessons = input.chapters[1].lessons.filter((l) => l.id !== 'les-1-2-1');
updateCourse('course-1', input);
logout();
login('student', 'student123');
course = fetchCourseDetail('course-1')!;
store.getState().reset();
store.getState().loadCourseProgress(course);
check('被删课时进度已清理', fetchProgress('course-1', 'les-1-2-1') === null);
check('第2章只剩1节', course.chapters.find((c) => c.id === 'ch-1-2')!.lessons.length === 1);
check('剩下的les-1-2-2成为第1节且解锁', store.getState().isLessonUnlocked(course, 'ch-1-2', 'les-1-2-2'));
records = fetchLearningRecords();
rec = records.find((r) => r.courseId === 'course-1')!;
check('学习记录不再指向被删课时', rec.lastLessonId !== 'les-1-2-1');
check('学习记录总数已更新', rec.totalLessons === 5);

console.log('== 10. 调整顺序后按新顺序解锁 ==');
logout();
login('admin', 'admin123');
input = toInput(fetchCourseDetail('course-1')!);
// 把第1章最后一节(les-1-1-3)挪到第1章最前面
const lessons = input.chapters[0].lessons;
const last = lessons.pop()!;
lessons.unshift(last);
updateCourse('course-1', input);
logout();
login('student', 'student123');
course = fetchCourseDetail('course-1')!;
store.getState().reset();
store.getState().loadCourseProgress(course);
const sortedL = [...course.chapters.find((c) => c.id === 'ch-1-1')!.lessons].sort((a, b) => a.sortOrder - b.sortOrder);
check('les-1-1-3 现在是第1节', sortedL[0].id === 'les-1-1-3');
check('第1节(原les-1-1-3)解锁', store.getState().isLessonUnlocked(course, 'ch-1-1', 'les-1-1-3'));
check('原第1节les-1-1-1已学过仍解锁', store.getState().isLessonUnlocked(course, 'ch-1-1', 'les-1-1-1'));
check('进度小测仍未丢', fetchQuizResult('course-1', 'les-1-1-1')?.passed === true);

console.log('== 11. 最后一章作业只体现在记录里 ==');
reportProgress('course-1', 'les-1-2-2', 99999);
submitQuizResult('course-1', 'les-1-2-2', 100);
submitAssignment('course-1', 'ch-1-2', '最后一章作业');
store.getState().loadCourseProgress(course);
check('最后一章作业待批改', store.getState().getAssignment('course-1', 'ch-1-2')?.status === 'pending');
records = fetchLearningRecords();
rec = records.find((r) => r.courseId === 'course-1')!;
check('学习记录可见最后一章待批改', rec.assignments.some((a) => a.chapterId === 'ch-1-2' && a.status === 'pending'));

console.log('== 12. 管理员豁免 ==');
logout();
login('admin', 'admin123');
course = fetchCourseDetail('course-1')!;
store.getState().reset();
store.getState().loadCourseProgress(course);
check('管理员任意课都解锁', store.getState().isLessonUnlocked(course, 'ch-1-2', 'les-1-2-2'));

console.log('== 13. 自建课程未出题时看完90%即通过 ==');
const newCourse = addCourse({
  title: '测试课程',
  description: '测试',
  coverUrl: 'https://example.com/cover.png',
  chapters: [
    {
      title: '唯一章',
      sortOrder: 1,
      lessons: [
        { title: '无题课', videoUrl: 'https://example.com/a.mp4', durationSec: 100, sortOrder: 1, quiz: [] },
        { title: '有题课', videoUrl: 'https://example.com/b.mp4', durationSec: 100, sortOrder: 2, quiz: [{ question: '1+1=?', options: ['2', '3'], correctIndex: 0 }] },
      ],
    },
  ],
});
logout();
login('student', 'student123');
const custom = fetchCourseDetail(newCourse.id)!;
store.getState().reset();
store.getState().loadCourseProgress(custom);
const noQuizLesson = custom.chapters[0].lessons[0];
check('自建课无题课时不补默认题', noQuizLesson.quiz.length === 0);
reportProgress(newCourse.id, noQuizLesson.id, 95);
store.getState().loadCourseProgress(custom);
check('无题课时看完90%即cleared', store.getState().isLessonCleared(custom, noQuizLesson));
check('下一节随之解锁', store.getState().isLessonUnlocked(custom, custom.chapters[0].id, custom.chapters[0].lessons[1].id));
check('内置课仍有默认小测题', fetchCourseDetail('course-1')!.chapters[0].lessons[0].quiz.length > 0);

console.log(failures === 0 ? '\n全部通过 ✅' : `\n${failures} 项失败 ❌`);
process.exit(failures === 0 ? 0 : 1);
