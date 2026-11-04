"""Optional regeneration: pip install reportlab arabic-reshaper python-bidi.
The generated Arabic PDFs are committed; Python is not required at runtime.
"""
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from bidi.algorithm import get_display
import arabic_reshaper

ROOT = Path(__file__).resolve().parent.parent
pdfmetrics.registerFont(TTFont('Arabic', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
MODULES = [
    ('intro', 'مدخل إلى البرمجة', [
        ('معنى البرمجة', 'كتابة تعليمات واضحة ينفذها الحاسوب لإنجاز مهمة محددة.'),
        ('الخوارزمية', 'مجموعة خطوات مرتبة لحل مشكلة، مثل خطوات إعداد كوب شاي.'),
        ('قبل كتابة الحل', 'افهم المطلوب، وحدد البيانات المتاحة والنتيجة المطلوبة.'),
        ('اختبار الحل', 'جرّب الحل على أكثر من مثال، وقارن النتيجة بما تتوقعه.'),
    ], 'اشرح بأسلوبك معنى الخوارزمية، واكتب مثالاً من حياتك اليومية.'),
    ('variables', 'المتغيرات والبيانات', [
        ('وظيفة المتغير', 'مكان لتخزين قيمة يمكن استخدامها وتغييرها أثناء عمل البرنامج.'),
        ('البيانات النصية', 'تستخدم لتمثيل الكلمات والأسماء، مثل اسم الطالب أو المدينة.'),
        ('البيانات العددية', 'تستخدم للحساب، مثل العمر وعدد الطلاب ودرجات الامتحان.'),
        ('تغيير القيمة', 'بعد تحديث قيمة المتغير، يمكن استخدام قيمته الجديدة في الخطوات التالية.'),
    ], 'اشرح الفرق بين البيانات النصية والعددية، واذكر مثالاً لكل نوع.'),
    ('conditions', 'الشروط والتكرار', [
        ('الشرط', 'قرار يعتمد على تحقق حالة؛ إذا تحققت الحالة ننفذ أمراً معيناً.'),
        ('مثال على الشرط', 'إذا كانت درجة الطالب خمسين أو أكثر، تكون نتيجة الشرط ناجحاً.'),
        ('التكرار', 'تنفيذ مجموعة خطوات عدة مرات دون كتابة نفس التعليمات كل مرة.'),
        ('مثال على التكرار', 'إرسال رسالة ترحيب لكل طالب مسجل في قائمة الطلاب.'),
    ], 'اذكر مثالاً لقرار يعتمد على شرط، ومثالاً لمهمة تحتاج تكراراً.'),
]
for key, title, sections, exercise in MODULES:
    output = ROOT / 'public' / 'files' / f'basic-{key}.pdf'
    output.parent.mkdir(parents=True, exist_ok=True)
    pdf = canvas.Canvas(str(output), pagesize=(595, 842))
    pdf.setTitle(f'Basic Bundle - {key}')
    pdf.setFillColorRGB(.03, .07, .15)
    pdf.rect(0, 0, 595, 842, fill=1, stroke=0)

    def line(text, y, size=12, accent=False):
        pdf.setFont('Arabic', size)
        pdf.setFillColorRGB(*((.35, .8, 1) if accent else (.93, .96, 1)))
        pdf.drawRightString(550, y, get_display(arabic_reshaper.reshape(text)))

    line(title, 765, 24, True)
    line('الكورس الأساسي • منصة مستر عبدالرحمن الأسيوطي', 720, 12)
    y = 650
    for heading, body in sections:
        line(heading, y, 17, True)
        line(body, y - 34, 11)
        y -= 110
    line('سؤال للتفكير — إجابة مقالية عادية، بدون كود', 170, 15, True)
    line(exercise, 134, 11)
    line('اختبار الوحدة: أربعة أسئلة اختيار وسؤال مقالي يراجعه المعلم.', 75, 11)
    pdf.save()
    print(output.relative_to(ROOT))
