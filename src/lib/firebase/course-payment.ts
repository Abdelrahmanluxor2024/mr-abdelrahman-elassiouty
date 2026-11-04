import { doc, getDoc, runTransaction, type Firestore } from 'firebase/firestore';

export function coursePrice(data: Record<string, any>): number {
  const raw = data.price;
  if ((typeof raw !== 'number' && typeof raw !== 'string') || (typeof raw === 'string' && raw.trim() === '') || !Number.isFinite(Number(raw)) || Number(raw) < 0 || !Number.isSafeInteger(Math.round(Number(raw) * 100))) throw new Error('سعر الكورس غير صالح. تواصل مع الإدارة');
  const price = Math.round(Number(raw) * 100) / 100;
  if (Math.abs(price - Number(raw)) > 0.000001) throw new Error('السعر يجب ألا يزيد عن منزلتين عشريتين');
  if (price === 0 && !(data.is_free === true || data.isFree === true)) throw new Error('الكورس غير محدد كمجاني. راجع الإدارة');
  return price;
}

export function purchaseId(uid: string, courseId: string) { return `${uid}_${courseId}`; }

export function hasPaidReceipt(enrollment: Record<string, any>, receipt: Record<string, any>, uid: string, courseId: string) {
  return enrollment.studentId === uid && enrollment.courseId === courseId && enrollment.paymentStatus === 'completed' &&
    receipt.studentId === uid && receipt.courseId === courseId && receipt.status === 'completed' && receipt.type === 'debit' &&
    Number(enrollment.paidAmount) > 0 && Number(enrollment.paidAmount) === Number(receipt.amount) &&
    Number.isFinite(Number(receipt.balanceBefore)) && Number.isFinite(Number(receipt.balanceAfter)) &&
    Math.abs(Number(receipt.balanceBefore) - Number(receipt.balanceAfter) - Number(receipt.amount)) < 0.001 && Number(receipt.balanceAfter) >= 0;
}

/** Paid access requires the receipt produced in the same transaction as the debit. */
export async function hasCourseAccess(database: Firestore, uid: string, courseId: string): Promise<boolean> {
  const course = await getDoc(doc(database, 'courses', courseId));
  if (!course.exists() || !(course.data().is_published ?? course.data().isPublished)) return false;
  let price: number;
  try {price = coursePrice(course.data());} catch {return false;}
  if (price === 0) return true;
  if (!uid || uid === 'current-student') return false;
  const id = purchaseId(uid, courseId);
  const [enrollment, receipt] = await Promise.all([
    getDoc(doc(database, 'enrollments', id)), getDoc(doc(database, 'wallet_transactions', id))
  ]);
  return enrollment.exists() && receipt.exists() && enrollment.data().transactionId === id && hasPaidReceipt(enrollment.data(), receipt.data(), uid, courseId);
}

/** All reads precede all writes. Firestore retries concurrent purchases safely. */
export async function purchaseInTransaction(database: Firestore, uid: string, courseId: string) {
  if (!uid || uid === 'current-student' || !courseId || courseId.includes('/')) throw new Error('سجّل الدخول أولاً');
  const id = purchaseId(uid, courseId);
  const courseRef = doc(database, 'courses', courseId), userRef = doc(database, 'users', uid);
  const enrollmentRef = doc(database, 'enrollments', id), receiptRef = doc(database, 'wallet_transactions', id);
  return runTransaction(database, async transaction => {
    const [course, user, enrollment, receipt] = await Promise.all([
      transaction.get(courseRef), transaction.get(userRef), transaction.get(enrollmentRef), transaction.get(receiptRef)
    ]);
    if (!course.exists() || !(course.data().is_published ?? course.data().isPublished)) throw new Error('الكورس غير متاح حالياً');
    const price = coursePrice(course.data());
    if (!user.exists()) throw new Error('حساب الطالب غير موجود');
    if (enrollment.exists() && ((price === 0 && enrollment.data().paymentStatus === 'free') || (receipt.exists() && enrollment.data().transactionId === id && hasPaidReceipt(enrollment.data(), receipt.data(), uid, courseId)))) return {alreadyEnrolled: true, charged: 0};
    // Never silently overwrite an inconsistent existing ledger entry.
    if (receipt.exists()) throw new Error('يوجد إيصال سابق يحتاج مراجعة الإدارة؛ لن يتم خصم مبلغ آخر');
    const balance = Number(user.data().walletBalance ?? user.data().wallet_balance ?? 0);
    if (!Number.isFinite(balance) || balance < 0) throw new Error('بيانات المحفظة غير صالحة. تواصل مع الإدارة');
    if (balance < price) throw new Error(`رصيدك ${balance} ج.م، وسعر الكورس ${price} ج.م. اشحن المحفظة أولاً`);
    const createdAt = new Date().toISOString();
    const after = Math.round((balance - price) * 100) / 100;
    if (price > 0) {
      transaction.update(userRef, {walletBalance: after, wallet_balance: after});
      transaction.set(receiptRef, {studentId: uid, courseId, amount: price, type: 'debit', status: 'completed', balanceBefore: balance, balanceAfter: after, description: `شراء كورس: ${course.data().title}`, createdAt});
    }
    transaction.set(enrollmentRef, {studentId: uid, courseId, paymentStatus: price > 0 ? 'completed' : 'free', paidAmount: price, transactionId: price > 0 ? id : null, enrolledAt: createdAt, progress: 0});
    return {alreadyEnrolled: false, charged: price};
  });
}
