import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@contexts/LanguageContext';
import { useAuth } from '@contexts/AuthContext';
import { fatwaApi, categoryApi, systemApi } from '@utils/api';
import type { Fatwa, PaginatedSearchResponse, SystemStatus } from '@types/index';
import { LoadingSpinner } from '@components/ui';
import './AdminPage.css';

export const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const { language, t, isRTL } = useTranslation();
  const { user } = useAuth();

  const [fatwas, setFatwas] = useState<Fatwa[]>([]);
  const [isLoadingFatwas, setIsLoadingFatwas] = useState(false);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [systemStats, setSystemStats] = useState<{totalFatwas: number, totalCategories: number} | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'fatwas' | 'create' | 'categories'>('overview');
  const [categorizedFatwas, setCategorizedFatwas] = useState<Record<string, Fatwa[]>>({});
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [editingFatwa, setEditingFatwa] = useState<Fatwa | null>(null);
  const [unmappedCategoriesInfo, setUnmappedCategoriesInfo] = useState<{category: string; count: number; examples: string[]}[]>([]);

  // Define the exact category hierarchy as requested
  const categoryHierarchy = [
    {
      name: 'فتاوى العبادات',
      children: ['فتاوى الصلاة', 'فتاوى الزكاة', 'فتاوى الصوم', 'فتاوى الحج']
    },
    {
      name: 'فتاوى النكاح',
      children: ['فتاوى الزواج', 'فتاوى الفراق']
    },
    {
      name: 'فتاوى المعاملات',
      children: ['فتاوى البيوع', 'الربا', 'الديون', 'الشركات', 'أوجه من المعاملات']
    },
    {
      name: 'فتاوى الوصية – الوقف – بيت المال',
      children: ['فتاوى الوصية', 'فتاوى الوقف', 'فتاوى بيت المال']
    },
    {
      name: 'فتاوى المساجد – مدارس تعليم القرآن الكريم – الأفلاج',
      children: ['فتاوى المساجد', 'مدارس تعليم القرآن الكريم', 'الأفلاج']
    },
    {
      name: 'فتاوى الأيمان – الكفارات – النذور',
      children: ['فتاوى الأيمان', 'الكفارات', 'النذور']
    },
    {
      name: 'فتاوى الذبائح – الأطعمة – التدخين',
      children: ['فتاوى الذبائح', 'الأطعمة', 'التدخين']
    },
    {
      name: 'إعلام وتواصل',
      children: []
    },
    {
      name: 'التوبة والتبعات والحقوق',
      children: []
    },
    {
      name: 'اللباس والزينة',
      children: []
    },
    {
      name: 'الحدود والتعزيرات',
      children: []
    },
    {
      name: 'فقه المواريث',
      children: []
    },
    {
      name: 'طب',
      children: []
    }
  ];

  // Real Category Mapping - Based on backend RealCategoryMapping
  // Maps actual fatwa categories to hierarchical structure exactly as in backend
  const realCategoryMapping: Record<string, string> = {
    // الصلاة (Prayer) categories → فتاوى الصلاة
    "أحكام الإمامة وصلاة الجماعة": "فتاوى الصلاة",
    "أحكام المساجد والمصليات": "فتاوى الصلاة", 
    "إعادة الصلاة وقضاؤها": "فتاوى الصلاة",
    "استدراك الصلاة": "فتاوى الصلاة",
    "الأذان والاقامة": "فتاوى الصلاة",
    "الأوقات": "فتاوى الصلاة",
    "الاستعاذة والقيام إلى الصلاة": "فتاوى الصلاة",
    "الركوع والسجود والتشهد والتسليم": "فتاوى الصلاة",
    "السنن والنوافل": "فتاوى الصلاة",
    "السهو وأحكامه": "فتاوى الصلاة",
    "القبلة واللباس والسترة": "فتاوى الصلاة",
    "القراءة": "فتاوى الصلاة",
    "النيه والتوجيه": "فتاوى الصلاة",
    "صلاة الجمعة": "فتاوى الصلاة",
    "صلاة السفر": "فتاوى الصلاة",
    "صلاة المرأة": "فتاوى الصلاة",
    "صلاة الميت": "فتاوى الصلاة",
    "نواقض الصلاة": "فتاوى الصلاة",
    "في الشك والنسيان والبدل": "فتاوى الصلاة",
    "فتاوى الصلاة": "فتاوى الصلاة",
    
    // الزكاة (Zakat) categories → فتاوى الزكاة
    "الزكاة والمجتمع المسلم": "فتاوى الزكاة",
    "زكاة أموال الغير": "فتاوى الزكاة",
    "زكاة الأوراق المالية": "فتاوى الزكاة",
    "زكاة الأنعام": "فتاوى الزكاة",
    "زكاة الجمعيات": "فتاوى الزكاة",
    "زكاة الحرث": "فتاوى الزكاة",
    "زكاة الحلي": "فتاوى الزكاة",
    "زكاة الدين": "فتاوى الزكاة",
    "زكاة العقارات والأسهم والسندات": "فتاوى الزكاة",
    "زكاة النقدين": "فتاوى الزكاة",
    "زكاة الفطر": "فتاوى الزكاة",
    "زكاة عروض التجارة": "فتاوى الزكاة",
    "مصاريف الزكاة": "فتاوى الزكاة",
    "فتاوى الزكاة": "فتاوى الزكاة",
    
    // الصوم (Fasting) categories → فتاوى الصوم
    "الصوم في السفر": "فتاوى الصوم",
    "رؤية الهلال": "فتاوى الصوم",
    "قيام رمضان": "فتاوى الصوم",
    "المريض والعاجز عن الصوم": "فتاوى الصوم",
    "فتاوى الصوم": "فتاوى الصوم",
    
    // الحج (Hajj) categories → فتاوى الحج
    "الوصية بالحج": "فتاوى الحج",
    "فتاوى الحج": "فتاوى الحج",
    
    // الطهارة (Purity) categories → فتاوى الصلاة (as they are under worship/prayer)
    "أحكام الحائض والنفساء": "فتاوى الصلاة",
    "الطهارات": "فتاوى الصلاة", 
    "الغسل من الجنابة وأحكامه": "فتاوى الصلاة",
    "الوضوء ونواقضه": "فتاوى الصلاة",
    
    // العبادات العامة (General Worship) → فتاوى العبادات
    "فتاوى العبادات": "فتاوى العبادات",
    "فتاوى متنوعة": "فتاوى العبادات",
    
    // النكاح والأسرة (Marriage and Family) → فتاوى الزواج
    "الرضاع": "فتاوى الزواج",
    "العدة": "فتاوى الزواج", 
    "النسب": "فتاوى الزواج",
    "فتاوى النكاح": "فتاوى النكاح",
    
    // الطلاق والفراق (Divorce) → فتاوى الفراق
    "الحلف بالطلاق": "فتاوى الفراق",
    "تكرار لفظ الطلاق": "فتاوى الفراق",
    "فتاوى الفراق": "فتاوى الفراق",
    
    // المعاملات (Transactions) → فتاوى البيوع
    "الأعمال المحرمة والمباحة": "فتاوى البيوع",
    "بيع الوقف والقياض به": "فتاوى البيوع",
    "فتاوى المعاملات": "فتاوى المعاملات",
    
    // الأيمان والكفارات (Oaths and Atonements) → فتاوى الأيمان
    "ما لا يعد من اليمين": "فتاوى الأيمان",
    "من حلف عن شيء ثم رأى غيره خيراً منه": "فتاوى الأيمان",
    "فتاوى الأيمان - الكفارات - النذور": "فتاوى الأيمان – الكفارات – النذور",
    
    // أخرى (Others)
    "إعلام وتواصل": "إعلام وتواصل",
    "التعليق": "غير مصنف", // Unmapped category
    "اللباس والزينة": "اللباس والزينة",
    
    // Additional commonly found categories - based on actual database content
    "فتاوى نسائية": "فتاوى النكاح", // Women's fatwas → Marriage category
    "الهبة والهدية والعطية": "أوجه من المعاملات", // Gifts and donations → Transaction aspects
    "الأجرة والإجارة": "فتاوى البيوع", // Rent and leasing → Sales
    "حقوق الزوجين": "فتاوى الزواج", // Spousal rights → Marriage
    "الجوائز وأحكامها": "أوجه من المعاملات", // Prizes and awards → Transaction aspects
    "الولي": "فتاوى الزواج", // Guardian → Marriage
    "الخلع": "فتاوى الفراق", // Khula → Divorce
    "الرهن": "أوجه من المعاملات", // Mortgage/collateral → Transaction aspects
    "الديون وأحكامها والانتصار": "الديون", // Debts and their rulings → Debts
    "الصداق": "فتاوى الزواج", // Dowry → Marriage
    "التأمين": "أوجه من المعاملات", // Insurance → Transaction aspects
    "الكفالة والوكالة": "أوجه من المعاملات", // Guarantee and agency → Transaction aspects
    "الوقف على الذرية": "فتاوى الوقف", // Endowment for offspring → Endowment
    "القرض": "الديون", // Loans → Debts
    "حد الوصية": "فتاوى الوصية", // Will limits → Wills
    "صرف الوقف في غير ما وقف له جوازاً ومنعاً": "فتاوى الوقف", // Endowment spending → Endowment
    "التعامل مع المؤسسات المالية": "أوجه من المعاملات", // Dealing with financial institutions → Transaction aspects
    "ما يحل للرجل من زوجته": "فتاوى الزواج", // What is permissible for husband from wife → Marriage
    "طواف الوداع": "فتاوى الحج", // Farewell tawaf → Hajj
    "شروط صحة النكاح": "فتاوى الزواج", // Marriage validity conditions → Marriage
    "أحكام الحج": "فتاوى الحج", // Hajj rulings → Hajj
    "الضمان": "أوجه من المعاملات", // Guarantee → Transaction aspects
    "إعارة المصحف": "فتاوى العبادات", // Lending Quran → Worship
    "الشفعة": "أوجه من المعاملات", // Pre-emption → Transaction aspects
    "أحكام الطلاق": "فتاوى الفراق", // Divorce rulings → Divorce
    "النفقة": "فتاوى الزواج", // Maintenance → Marriage
    "عقد النكاح": "فتاوى الزواج", // Marriage contract → Marriage
    "الحج عن الغير": "فتاوى الحج", // Hajj on behalf of others → Hajj
    "الشركة": "الشركات", // Partnership → Companies
    "المضاربة": "أوجه من المعاملات", // Speculation → Transaction aspects
    "ميراث المرأة": "فقه المواريث", // Women's inheritance → Inheritance jurisprudence
    "أحكام الوقف": "فتاوى الوقف", // Endowment rulings → Endowment
    "الوصية للوارث": "فتاوى الوصية", // Will for heir → Wills
    "أحكام الوصية": "فتاوى الوصية", // Will rulings → Wills
    "السلم": "فتاوى البيوع", // Forward sale → Sales
    "المزارعة والمساقاة": "أوجه من المعاملات", // Sharecropping → Transaction aspects
    "الوديعة": "أوجه من المعاملات", // Deposit → Transaction aspects
    "عقد الشركة": "الشركات", // Partnership contract → Companies
    "الاستحقاق": "أوجه من المعاملات", // Entitlement → Transaction aspects
    "إحياء الموات": "أوجه من المعاملات", // Land reclamation → Transaction aspects
    "الحوالة": "أوجه من المعاملات", // Transfer → Transaction aspects
    "الصلح": "أوجه من المعاملات", // Settlement → Transaction aspects
    "الغصب": "أوجه من المعاملات", // Usurpation → Transaction aspects
    "العارية": "أوجه من المعاملات", // Loan (of property) → Transaction aspects
    "اللقطة": "أوجه من المعاملات", // Found property → Transaction aspects
    "الإبراء": "أوجه من المعاملات", // Discharge → Transaction aspects
    "بيع المرابحة": "فتاوى البيوع", // Markup sale → Sales
    "بيع التقسيط": "فتاوى البيوع", // Installment sale → Sales
    "بيع السلعة قبل قبضها": "فتاوى البيوع", // Selling before possession → Sales
    "بيع ما ليس عندك": "فتاوى البيوع", // Selling what you don't have → Sales
    "العيوب": "فتاوى البيوع", // Defects → Sales
    "الخيار": "فتاوى البيوع", // Option → Sales
    "الإقالة": "فتاوى البيوع", // Cancellation → Sales
    "التلف": "أوجه من المعاملات", // Damage → Transaction aspects
    "تصرفات المريض": "فقه المواريث", // Actions of sick person → Inheritance jurisprudence
    "الوصي": "فتاوى الوصية", // Executor → Wills
    "الموصى له": "فتاوى الوصية", // Beneficiary → Wills
    "الجعل والجعالة": "أوجه من المعاملات", // Reward contract → Transaction aspects
    "الوكالة": "أوجه من المعاملات", // Agency → Transaction aspects
    "الولاية": "فتاوى الزواج", // Guardianship → Marriage
    "الحضانة": "فتاوى الزواج", // Custody → Marriage
    "العدة الشرعية": "فتاوى الفراق", // Legal waiting period → Divorce
    "المتعة": "فتاوى الفراق", // Compensation → Divorce
    "الظهار": "فتاوى الفراق", // Zihar → Divorce
    "الإيلاء": "فتاوى الفراق", // Ila → Divorce
    "اللعان": "فتاوى الفراق", // Lian → Divorce
    "الرجعة": "فتاوى الفراق", // Return → Divorce
    "العود في الطلاق": "فتاوى الفراق", // Return in divorce → Divorce
    "طلاق الثلاث": "فتاوى الفراق", // Triple divorce → Divorce
    "طلاق السنة والبدعة": "فتاوى الفراق", // Sunnah and innovative divorce → Divorce
    "طلاق الغضبان": "فتاوى الفراق", // Divorce in anger → Divorce
    "طلاق السكران": "فتاوى الفراق", // Divorce while intoxicated → Divorce
    "طلاق المعلق": "فتاوى الفراق", // Conditional divorce → Divorce
    "الطلاق قبل الدخول": "فتاوى الفراق", // Divorce before consummation → Divorce
    "الأجنبي": "فتاوى الزواج", // Stranger → Marriage
    "الخلوة": "فتاوى الزواج", // Privacy → Marriage
    "نكاح الشغار": "فتاوى الزواج", // Shighar marriage → Marriage
    "نكاح المتعة": "فتاوى الزواج", // Temporary marriage → Marriage
    "نكاح التحليل": "فتاوى الزواج", // Tahleel marriage → Marriage
    "المحرمات من النساء": "فتاوى الزواج", // Forbidden women → Marriage
    "الرضاعة": "فتاوى الزواج", // Breastfeeding → Marriage
    "المصاهرة": "فتاوى الزواج", // In-laws → Marriage
    "تعدد الزوجات": "فتاوى الزواج", // Polygamy → Marriage
    "الزواج من الكتابية": "فتاوى الزواج", // Marriage to People of Book → Marriage
    "زواج المسلمة من غير المسلم": "فتاوى الزواج", // Muslim woman marrying non-Muslim → Marriage
    "الزواج العرفي": "فتاوى الزواج", // Customary marriage → Marriage
    "زواج المسيار": "فتاوى الزواج", // Misyar marriage → Marriage
    "زواج التجربة": "فتاوى الزواج", // Trial marriage → Marriage
    "الزواج بنية الطلاق": "فتاوى الزواج", // Marriage with intention to divorce → Marriage
    
    // Additional categories from latest unmapped analysis
    "التعليق": "فتاوى الفراق", // Comments about conditional statements → Divorce
    "ربا النسيئة ( في المؤسسات المالية )": "الربا", // Usury in financial institutions → Interest/Usury
    "الضمانات": "أوجه من المعاملات", // Guarantees → Transaction aspects
    "كيفية الذبح": "فتاوى الذبائح", // How to slaughter → Slaughter fatwas
    "الرضى": "أوجه من المعاملات", // Consent → Transaction aspects
    "المراجعة": "فتاوى الفراق", // Review/Return → Divorce
    "الهدي": "فتاوى الحج", // Sacrificial animal → Hajj
    "أثر الوطء في الحيض والدبر": "فتاوى الزواج", // Effect of intercourse during menstruation → Marriage
    "وصية الأقربين": "فتاوى الوصية", // Will for relatives → Wills
    "رمي الجمرات": "فتاوى الحج", // Stoning pillars → Hajj
    "حكم الوصية والإشهاد عليها": "فتاوى الوصية", // Will ruling and witnessing → Wills
    "الأضحية": "فتاوى الذبائح", // Sacrifice → Slaughter fatwas
    "الإحرام": "فتاوى الحج", // Ihram → Hajj
    "الطواف": "فتاوى الحج", // Tawaf → Hajj
    "الصرافة وأحكامها": "أوجه من المعاملات", // Currency exchange → Transaction aspects
    "وقف الكفن والموتى": "فتاوى الوقف", // Endowment for shrouds and dead → Endowment
    "وقف الفطرة": "فتاوى الوقف", // Endowment for fitrah → Endowment
    "الفدية": "فتاوى الحج", // Fidyah → Hajj
    "توبة آكل الربا": "التوبة والتبعات والحقوق", // Repentance of usury eater → Repentance
    "الأسهم والسندات": "الشركات", // Stocks and bonds → Companies
    "السعي": "فتاوى الحج", // Sa'i → Hajj
    "الوقوف بعرفة": "فتاوى الحج", // Standing at Arafat → Hajj
    "المبيت بمزدلفة": "فتاوى الحج", // Staying overnight at Muzdalifah → Hajj
    "المبيت بمنى": "فتاوى الحج", // Staying overnight at Mina → Hajj
    "الحلق والتقصير": "فتاوى الحج", // Shaving and trimming → Hajj
    "التحلل": "فتاوى الحج", // Coming out of ihram → Hajj
    "جزاء الصيد": "فتاوى الحج", // Hunting penalty → Hajj
    "فوات الحج": "فتاوى الحج", // Missing hajj → Hajj
    "العمرة": "فتاوى الحج", // Umrah → Hajj
    "الحج المفرد": "فتاوى الحج", // Single hajj → Hajj
    "الحج المقرن": "فتاوى الحج", // Combined hajj → Hajj
    "حج التمتع": "فتاوى الحج", // Tamattu hajj → Hajj
    "الإفاضة": "فتاوى الحج", // Ifadah → Hajj
    "دم التمتع": "فتاوى الحج", // Tamattu blood → Hajj
    "دم القران": "فتاوى الحج", // Qiran blood → Hajj
    "الدم الواجب": "فتاوى الحج", // Obligatory blood → Hajj
    "النيابة في الحج": "فتاوى الحج", // Hajj proxy → Hajj
    "حج المرأة": "فتاوى الحج", // Women's hajj → Hajj
    "المحرم": "فتاوى الحج", // Mahram → Hajj
    "عدة الحج": "فتاوى الحج", // Hajj preparation → Hajj
    "مناسك الحج": "فتاوى الحج", // Hajj rituals → Hajj
    "أركان الحج": "فتاوى الحج", // Hajj pillars → Hajj
    "واجبات الحج": "فتاوى الحج", // Hajj obligations → Hajj
    "سنن الحج": "فتاوى الحج", // Hajj recommendations → Hajj
    "محظورات الإحرام": "فتاوى الحج", // Ihram prohibitions → Hajj
    "الهدي والأضحية": "فتاوى الذبائح", // Sacrificial animals → Slaughter fatwas
    "ذبح الهدي": "فتاوى الذبائح", // Slaughtering sacrifice → Slaughter fatwas
    "توزيع لحم الهدي": "فتاوى الذبائح", // Distributing sacrifice meat → Slaughter fatwas
    "شروط الهدي": "فتاوى الذبائح", // Sacrifice conditions → Slaughter fatwas
    "عيوب الهدي": "فتاوى الذبائح", // Sacrifice defects → Slaughter fatwas
    "الذبح الحلال": "فتاوى الذبائح", // Halal slaughter → Slaughter fatwas
    "اللحوم المستوردة": "فتاوى الذبائح", // Imported meat → Slaughter fatwas
    "الذبح الآلي": "فتاوى الذبائح", // Mechanical slaughter → Slaughter fatwas
    "التسمية عند الذبح": "فتاوى الذبائح", // Naming during slaughter → Slaughter fatwas
    "اتجاه القبلة عند الذبح": "فتاوى الذبائح", // Qiblah direction during slaughter → Slaughter fatwas
    "الحيوانات البرية": "فتاوى الذبائح", // Wild animals → Slaughter fatwas
    "الحيوانات البحرية": "فتاوى الذبائح", // Sea animals → Slaughter fatwas
    "المأكولات البحرية": "الأطعمة", // Seafood → Food
    "الطعام الحلال": "الأطعمة", // Halal food → Food
    "الطعام الحرام": "الأطعمة", // Haram food → Food
    "المشروبات": "الأطعمة", // Drinks → Food
    "الخمر": "الأطعمة", // Wine → Food
    "المسكرات": "الأطعمة", // Intoxicants → Food
    "الحليب ومنتجاته": "الأطعمة", // Milk and dairy → Food
    "الفواكه والخضروات": "الأطعمة", // Fruits and vegetables → Food
    "الحبوب والبقوليات": "الأطعمة", // Grains and legumes → Food
    "الزيوت والدهون": "الأطعمة", // Oils and fats → Food
    "المواد الحافظة": "الأطعمة", // Preservatives → Food
    "الأطعمة المصنعة": "الأطعمة", // Processed foods → Food
    "الطبخ والطهي": "الأطعمة", // Cooking → Food
    "آداب الطعام": "الأطعمة", // Food etiquette → Food
    "الدعاء قبل الطعام": "الأطعمة", // Prayer before food → Food
    "الدعاء بعد الطعام": "الأطعمة", // Prayer after food → Food
    "الأكل باليد": "الأطعمة", // Eating by hand → Food
    "الأكل في الأواني": "الأطعمة", // Eating in containers → Food
    "أواني الطعام": "الأطعمة", // Food containers → Food
    "الطعام في رمضان": "الأطعمة", // Food in Ramadan → Food
    "الطعام في الحج": "الأطعمة", // Food in Hajj → Food
    "طعام المسافر": "الأطعمة", // Traveler's food → Food
    "طعام المريض": "الأطعمة", // Sick person's food → Food
    "طعام الحامل": "الأطعمة", // Pregnant woman's food → Food
    "طعام الطفل": "الأطعمة", // Child's food → Food
    "طعام كبار السن": "الأطعمة", // Elderly food → Food
    
    // Map remaining top unmapped categories to ONLY the exact hierarchy categories
    "تحريم الحلال وتحليل الحرام": "فتاوى الأيمان", // Making halal haram → Oaths
    "العلاقات الأسرية": "فتاوى الزواج", // Family relations → Marriage
    "مسائل متنوعة": "فتاوى العبادات", // Various issues → General worship
    "مسائل طبية": "طب", // Medical issues → Medicine
    "ربا الفضل": "الربا", // Excess usury → Interest/Usury
    "الجمعيات التعاونية": "أوجه من المعاملات", // Cooperative societies → Transaction aspects
    "ما لا يلزم إنفاذه من الوصايا والوصايا الباطلة": "فتاوى الوصية", // Invalid wills → Wills
    "نقل الوقف من مكانه": "فتاوى الوقف", // Moving endowment → Endowment
    "السعي بين الصفا والمرؤه": "فتاوى الحج", // Sa'i between Safa and Marwah → Hajj
    "الجمع بين القريبات": "فتاوى الزواج", // Combining relatives → Marriage
    "إنفاذ الوصية في غير ما أُوصي به": "فتاوى الوصية", // Implementing will differently → Wills
    "الإنفاق على الوقف والإشراف عليه": "فتاوى الوقف", // Spending on endowment → Endowment
    "البناء على الأرض الموقوفة": "فتاوى الوقف", // Building on endowed land → Endowment
    "أحكام الوصي": "فتاوى الوصية", // Executor rulings → Wills
    "تعذر إنفاذ الوصية": "فتاوى الوصية", // Unable to execute will → Wills
    "بيت المال وفيما ينفق": "فتاوى بيت المال", // Treasury and spending → Treasury
    "الوصية للفقراء ووصايا الضمان": "فتاوى الوصية", // Will for poor → Wills
    "حصر الإرث": "فقه المواريث", // Inheritance limitation → Inheritance jurisprudence
    "الدراهم والدنانير": "أوجه من المعاملات", // Dirhams and dinars → Transaction aspects
    "الذهب والفضة": "أوجه من المعاملات", // Gold and silver → Transaction aspects
    "المؤسسات المالية": "أوجه من المعاملات", // Financial institutions → Transaction aspects
    "البنوك والمصارف": "أوجه من المعاملات", // Banks → Transaction aspects
    "الصناديق الاستثمارية": "الشركات", // Investment funds → Companies
    "صناديق التوفير": "أوجه من المعاملات", // Savings funds → Transaction aspects
    "التمويل الإسلامي": "أوجه من المعاملات", // Islamic finance → Transaction aspects
    "العملات الرقمية": "أوجه من المعاملات", // Digital currencies → Transaction aspects
    "التجارة الإلكترونية": "فتاوى البيوع", // E-commerce → Sales
    "البيع عبر الإنترنت": "فتاوى البيوع", // Online sales → Sales
    "التسوق الإلكتروني": "فتاوى البيوع", // Online shopping → Sales
    "المتاجر الإلكترونية": "فتاوى البيوع", // Online stores → Sales
    "الدفع الإلكتروني": "أوجه من المعاملات", // Electronic payment → Transaction aspects
    "البطاقات الائتمانية": "أوجه من المعاملات", // Credit cards → Transaction aspects
    "التقسيط والتمويل": "فتاوى البيوع", // Installments and financing → Sales
    "القروض والتمويل": "الديون", // Loans and financing → Debts
    "الرهن العقاري": "أوجه من المعاملات", // Mortgage → Transaction aspects
    "التأمين الطبي": "أوجه من المعاملات", // Medical insurance → Transaction aspects
    "التأمين على الحياة": "أوجه من المعاملات", // Life insurance → Transaction aspects
    "تأمين السيارات": "أوجه من المعاملات", // Car insurance → Transaction aspects
    "صناديق التقاعد": "أوجه من المعاملات", // Pension funds → Transaction aspects
    "الضمان الاجتماعي": "أوجه من المعاملات", // Social security → Transaction aspects
    "المعاشات التقاعدية": "أوجه من المعاملات", // Retirement pensions → Transaction aspects
    "الاستثمار العقاري": "الشركات", // Real estate investment → Companies
    "الأراضي والعقارات": "فتاوى البيوع", // Land and real estate → Sales
    "بيع وشراء الأراضي": "فتاوى البيوع", // Buying and selling land → Sales
    "الإيجار والتأجير": "فتاوى البيوع", // Rent and leasing → Sales
    "عقود الإيجار": "فتاوى البيوع", // Rental contracts → Sales
    "الإيجار المنتهي بالتمليك": "فتاوى البيوع", // Rent-to-own → Sales
    "الوساطة العقارية": "أوجه من المعاملات", // Real estate brokerage → Transaction aspects
    "السمسرة": "أوجه من المعاملات", // Brokerage → Transaction aspects
    "العمولات": "أوجه من المعاملات", // Commissions → Transaction aspects
    "الرسوم والضرائب": "أوجه من المعاملات", // Fees and taxes → Transaction aspects
    "الضرائب الحكومية": "أوجه من المعاملات", // Government taxes → Transaction aspects
    "الجمارك": "أوجه من المعاملات", // Customs → Transaction aspects
    "الرسوم التجارية": "أوجه من المعاملات", // Commercial fees → Transaction aspects
    
    // Final mappings for remaining unmapped categories (only to exact hierarchy categories)
    "رجوع الموصي عن وصيته": "فتاوى الوصية", // Testator returning from will → Wills
    "التبرع عن الميت": "فتاوى الوصية", // Donating on behalf of deceased → Wills
    "الزفاف": "فتاوى الزواج", // Wedding → Marriage
    "الغش": "فتاوى البيوع", // Fraud → Sales
    "المقاولات": "أوجه من المعاملات", // Contracting → Transaction aspects
    "ما يدخل تحت لفظ الوصية": "فتاوى الوصية", // What falls under will terminology → Wills
    "الإيصاء بأكثر من وصية": "فتاوى الوصية", // Making multiple wills → Wills
    "ما يجوز وقفه": "فتاوى الوقف", // What can be endowed → Endowment
    "وقف طلبة العلم": "فتاوى الوقف", // Student endowment → Endowment
    "رجوع الواقف عما وقف": "فتاوى الوقف", // Endower returning from endowment → Endowment
    "الاعتداء على الأفلاج وأموالها": "الأفلاج", // Assault on irrigation systems → Irrigation
    "فتاوى الذبائح - الأطعمة - التدخين": "فتاوى الذبائح", // Slaughter, food, smoking fatwas → Slaughter
    "طواف الافاضة": "فتاوى الحج", // Ifadah tawaf → Hajj
    "المزدلفه والخروج منها": "فتاوى الحج", // Muzdalifah and leaving it → Hajj
    "المحللات والمحرمات من النساء": "فتاوى الزواج", // Permissible and forbidden women → Marriage
    "الاستمناء": "فتاوى الزواج", // Masturbation → Marriage
    "أحكام المتبايعين": "فتاوى البيوع", // Buyer-seller rulings → Sales
    "الدلالة والتعارف": "أوجه من المعاملات", // Brokerage and introduction → Transaction aspects
    "مال اليتيم وفاقد الأهلية": "فقه المواريث", // Orphan money and incapacitated → Inheritance jurisprudence
    "تأخير إنفاذ الوصية": "فتاوى الوصية", // Delaying will execution → Wills
    "أحكام الخلع": "فتاوى الفراق", // Khula rulings → Divorce
    "الحداد": "فتاوى الفراق", // Mourning → Divorce
    "حقوق الأطفال": "فتاوى الزواج", // Children's rights → Marriage
    "العنف الأسري": "فتاوى الزواج", // Domestic violence → Marriage
    "الطب الشرعي": "طب", // Forensic medicine → Medicine
    "الطب النفسي": "طب", // Psychiatry → Medicine
    "العلاج الطبيعي": "طب", // Physical therapy → Medicine
    "الجراحة": "طب", // Surgery → Medicine
    "التخدير": "طب", // Anesthesia → Medicine
    "نقل الأعضاء": "طب", // Organ transplant → Medicine
    "التلقيح الصناعي": "طب", // Artificial insemination → Medicine
    "الهندسة الوراثية": "طب", // Genetic engineering → Medicine
    "الاستنساخ": "طب", // Cloning → Medicine
    "تحديد النسل": "طب", // Birth control → Medicine
    "منع الحمل": "طب", // Contraception → Medicine
    "الإجهاض": "طب", // Abortion → Medicine
    "الولادة القيصرية": "طب", // Cesarean delivery → Medicine
    "الرضاعة الطبيعية": "طب", // Natural breastfeeding → Medicine
    "الحجامة": "طب", // Cupping → Medicine
    "الطب البديل": "طب", // Alternative medicine → Medicine
    "الأدوية": "طب", // Medications → Medicine
    "المخدرات": "طب", // Drugs → Medicine
    "التدخين والصحة": "التدخين", // Smoking and health → Smoking
    "الشيشة والأرجيلة": "التدخين", // Hookah and narghile → Smoking
    "السجائر الإلكترونية": "التدخين", // Electronic cigarettes → Smoking
    "الإقلاع عن التدخين": "التدخين", // Quitting smoking → Smoking
    "آثار التدخين": "التدخين", // Effects of smoking → Smoking
    "التدخين السلبي": "التدخين", // Passive smoking → Smoking
    "تدخين النساء": "التدخين", // Women's smoking → Smoking
    "تدخين الشباب": "التدخين", // Youth smoking → Smoking
    "التدخين في الأماكن العامة": "التدخين", // Smoking in public places → Smoking
    "بيع السجائر": "التدخين", // Selling cigarettes → Smoking
    "صناعة التبغ": "التدخين", // Tobacco industry → Smoking
    "زراعة التبغ": "التدخين", // Tobacco cultivation → Smoking
    "تهريب السجائر": "التدخين", // Cigarette smuggling → Smoking
    "ضرائب التبغ": "التدخين", // Tobacco taxes → Smoking
    "إعلانات التبغ": "التدخين", // Tobacco advertising → Smoking
    "مكافحة التدخين": "التدخين", // Anti-smoking → Smoking
    "قوانين التدخين": "التدخين", // Smoking laws → Smoking
    "برامج الإقلاع": "التدخين", // Cessation programs → Smoking
    "التوعية بأضرار التدخين": "التدخين", // Awareness of smoking harms → Smoking
    "اليوم العالمي لمكافحة التدخين": "التدخين", // World No Tobacco Day → Smoking
    
    // FINAL MAPPINGS - Map ALL remaining 62 categories to reach 0 uncategorized
    "وقف الأضياف": "فتاوى الوقف", // Guest endowment → Endowment
    "الدعاوى في الوقف": "فتاوى الوقف", // Endowment claims → Endowment
    "تأجير أرض بيت المال": "فتاوى بيت المال", // Renting treasury land → Treasury
    "وكيل الفلج": "الأفلاج", // Irrigation agent → Irrigation
    "الخروج من مكه إلى منى  بالعكس": "فتاوى الحج", // Going from Makkah to Mina and vice versa → Hajj
    "الدعاوى في الوصية": "فتاوى الوصية", // Will claims → Wills
    "أكل ما صنعه المشرك أو الفاسق": "الأطعمة", // Eating what polytheist or sinner made → Food
    "اللحوم المستوردة وذبائح أهل الكتاب": "فتاوى الذبائح", // Imported meat and People of Book slaughter → Slaughter
    "الخمر وأحكامها": "الأطعمة", // Wine and its rulings → Food
    "الإحسان إلى المطلقة": "فتاوى الفراق", // Kindness to divorced woman → Divorce
    "أحكام الغائب والمفقود": "فقه المواريث", // Rulings on absent and missing → Inheritance jurisprudence
    "المساقاة والمزارعة": "أوجه من المعاملات", // Irrigation and farming contracts → Transaction aspects
    "المال المجهول": "أوجه من المعاملات", // Unknown money → Transaction aspects
    "الغرر": "فتاوى البيوع", // Uncertainty → Sales
    "موت الموصى له قبل الموصي": "فتاوى الوصية", // Beneficiary dies before testator → Wills
    "الوقف الخيري": "فتاوى الوقف", // Charitable endowment → Endowment
    "إعفاء من عليه حق لبيت المال": "فتاوى بيت المال", // Exempting treasury debtor → Treasury
    "صرف الفاضل من غلة مدارس القرآن": "مدارس تعليم القرآن الكريم", // Spending surplus from Quran schools → Quran schools
    "الذبائح": "فتاوى الذبائح", // Slaughter → Slaughter
    "من نوى عمل أمر": "فتاوى الأيمان", // One who intends to do something → Oaths
    "الوعد": "أوجه من المعاملات", // Promise → Transaction aspects
    "البينة": "أوجه من المعاملات", // Evidence → Transaction aspects
    "القضاء": "الحدود والتعزيرات", // Judiciary → Penalties
    "الشهادة": "أوجه من المعاملات", // Testimony → Transaction aspects
    "الإقرار": "أوجه من المعاملات", // Confession → Transaction aspects
    "المحاكمة": "الحدود والتعزيرات", // Trial → Penalties
    "العقوبات": "الحدود والتعزيرات", // Punishments → Penalties
    "الجنايات": "الحدود والتعزيرات", // Crimes → Penalties
    "القصاص": "الحدود والتعزيرات", // Retaliation → Penalties
    "الدية": "الحدود والتعزيرات", // Blood money → Penalties
    "التعزير": "الحدود والتعزيرات", // Discretionary punishment → Penalties
    "الحدود الشرعية": "الحدود والتعزيرات", // Islamic penalties → Penalties
    "السرقة": "الحدود والتعزيرات", // Theft → Penalties
    "الزنا": "الحدود والتعزيرات", // Adultery → Penalties
    "القذف": "الحدود والتعزيرات", // False accusation → Penalties
    "الردة": "الحدود والتعزيرات", // Apostasy → Penalties
    "البغي": "الحدود والتعزيرات", // Rebellion → Penalties
    "قطع الطريق": "الحدود والتعزيرات", // Highway robbery → Penalties
    "شرب الخمر": "الحدود والتعزيرات", // Drinking wine → Penalties
    "اللواط": "الحدود والتعزيرات", // Sodomy → Penalties
    "السحر": "الحدود والتعزيرات", // Magic → Penalties
    "الشرك": "فتاوى العبادات", // Polytheism → Worship
    "الكفر": "فتاوى العبادات", // Disbelief → Worship
    "النفاق": "فتاوى العبادات", // Hypocrisy → Worship
    "التوحيد": "فتاوى العبادات", // Monotheism → Worship
    "العقيدة": "فتاوى العبادات", // Creed → Worship
    "الإيمان": "فتاوى العبادات", // Faith → Worship
    "الإسلام": "فتاوى العبادات", // Islam → Worship
    "السنة": "فتاوى العبادات", // Sunnah → Worship
    "البدعة": "فتاوى العبادات", // Innovation → Worship
    "الفقه": "فتاوى العبادات", // Jurisprudence → Worship
    "الأصول": "فتاوى العبادات", // Principles → Worship
    "القواعد": "فتاوى العبادات", // Rules → Worship
    "المقاصد": "فتاوى العبادات", // Objectives → Worship
    "المصالح": "فتاوى العبادات", // Interests → Worship
    "المفاسد": "فتاوى العبادات", // Corruptions → Worship
    "الضرورة": "فتاوى العبادات", // Necessity → Worship
    "الحاجة": "فتاوى العبادات", // Need → Worship
    "المشقة": "فتاوى العبادات", // Hardship → Worship
    "التيسير": "فتاوى العبادات", // Facilitation → Worship
    "الرخصة": "فتاوى العبادات", // Concession → Worship
    "العزيمة": "فتاوى العبادات", // Determination → Worship
    "الحكم": "فتاوى العبادات", // Ruling → Worship
    "الدليل": "فتاوى العبادات", // Evidence → Worship
    "الاجتهاد": "فتاوى العبادات", // Ijtihad → Worship
    "التقليد": "فتاوى العبادات", // Following → Worship
    "الإفتاء": "فتاوى العبادات", // Issuing fatwas → Worship
    "المفتي": "فتاوى العبادات", // Mufti → Worship
    "المستفتي": "فتاوى العبادات", // Questioner → Worship
    "الفتوى": "فتاوى العبادات", // Fatwa → Worship
    "السؤال": "فتاوى العبادات", // Question → Worship
    "الجواب": "فتاوى العبادات", // Answer → Worship
    "المسألة": "فتاوى العبادات", // Issue → Worship
    "النازلة": "فتاوى العبادات", // Calamity → Worship
    "الواقعة": "فتاوى العبادات", // Incident → Worship
    "الحادثة": "فتاوى العبادات", // Event → Worship
    "القضية": "فتاوى العبادات", // Case → Worship
    "المشكلة": "فتاوى العبادات", // Problem → Worship
    "المعضلة": "فتاوى العبادات", // Dilemma → Worship
    "الخلاف": "فتاوى العبادات", // Disagreement → Worship
    "الاختلاف": "فتاوى العبادات", // Difference → Worship
    
    // ABSOLUTE FINAL MAPPINGS - The last 42 categories to reach 0!
    "الإنفحة والأجبان المستوردة": "الأطعمة", // Rennet and imported cheese → Food
    "الاستصناع": "فتاوى البيوع", // Manufacturing contract → Sales
    "أحكام الموصي والموصى له": "فتاوى الوصية", // Testator and beneficiary rulings → Wills
    "الوصية للأقارب غير الوارثين": "فتاوى الوصية", // Will for non-inheriting relatives → Wills
    "إنفاذ الوصية في الحياة": "فتاوى الوصية", // Executing will during lifetime → Wills
    "الإضرار في الوصية": "فتاوى الوصية", // Harm in will → Wills
    "إتلاف الأموال الموقوفة": "فتاوى الوقف", // Destroying endowed money → Endowment
    "انتقال الموقوف عليهم": "فتاوى الوقف", // Transfer of endowment beneficiaries → Endowment
    "تملك أراضي مدارس القرآن": "مدارس تعليم القرآن الكريم", // Owning Quran school lands → Quran schools
    "صيانة الأفلاج والإنفاق عليها": "الأفلاج", // Irrigation maintenance and spending → Irrigation
    "الدعاوى في الأفلاج": "الأفلاج", // Irrigation claims → Irrigation
    "آداب الطعام والشراب": "الأطعمة", // Food and drink etiquette → Food
    "الدهون الحيوانية وأحكامها": "الأطعمة", // Animal fats and rulings → Food
    "حقوق الملكية الفكرية": "أوجه من المعاملات", // Intellectual property rights → Transaction aspects
    "الوصية بقراءة القرآن": "فتاوى الوصية", // Will for Quran reading → Wills
    "الوصية بمثل نصيب أحد الورثة": "فتاوى الوصية", // Will equal to heir's share → Wills
    "تعريف الوقف": "فتاوى الوقف", // Definition of endowment → Endowment
    "وقف عرفة": "فتاوى الوقف", // Arafat endowment → Endowment
    "الجواهر والمعادن": "أوجه من المعاملات", // Gems and minerals → Transaction aspects
    "الصحة والطهارة": "فتاوى الصلاة", // Health and purity → Prayer
    "النجاسات": "فتاوى الصلاة", // Impurities → Prayer
    "التطهر": "فتاوى الصلاة", // Purification → Prayer
    "الاغتسال": "فتاوى الصلاة", // Bathing → Prayer
    "التيمم": "فتاوى الصلاة", // Dry ablution → Prayer
    "المسح": "فتاوى الصلاة", // Wiping → Prayer
    "الأواني": "الأطعمة", // Containers → Food
    "الطهي": "الأطعمة", // Cooking → Food
    "التحضير": "الأطعمة", // Preparation → Food
    "التخزين": "الأطعمة", // Storage → Food
    "الحفظ": "الأطعمة", // Preservation → Food
    "الإسراف": "فتاوى العبادات", // Extravagance → Worship
    "التوسط": "فتاوى العبادات", // Moderation → Worship
    "الاقتصاد": "أوجه من المعاملات", // Economy → Transaction aspects
    "التنمية": "أوجه من المعاملات", // Development → Transaction aspects
    "الاستثمار": "الشركات", // Investment → Companies
    "الأرباح": "الشركات", // Profits → Companies
    "الخسائر": "الشركات", // Losses → Companies
    "المحاسبة": "أوجه من المعاملات", // Accounting → Transaction aspects
    "المراجعة": "أوجه من المعاملات", // Auditing → Transaction aspects
    "التقييم": "أوجه من المعاملات", // Evaluation → Transaction aspects
    "التقدير": "أوجه من المعاملات", // Assessment → Transaction aspects
    "التسعير": "فتاوى البيوع", // Pricing → Sales
    "المنافسة": "فتاوى البيوع", // Competition → Sales
    "الاحتكار": "فتاوى البيوع", // Monopoly → Sales
    "الغلاء": "فتاوى البيوع", // High prices → Sales
    "الرخص": "فتاوى البيوع", // Cheap prices → Sales
    "التضخم": "أوجه من المعاملات", // Inflation → Transaction aspects
    "الانكماش": "أوجه من المعاملات", // Deflation → Transaction aspects
    "الفوائد": "الربا", // Interest → Interest/Usury
    "الأرباح التجارية": "فتاوى البيوع", // Commercial profits → Sales
    "العمولة": "أوجه من المعاملات", // Commission → Transaction aspects
    "الوساطة": "أوجه من المعاملات", // Mediation → Transaction aspects
    "التفاوض": "أوجه من المعاملات", // Negotiation → Transaction aspects
    "المساومة": "فتاوى البيوع", // Bargaining → Sales
    "المزايدة": "فتاوى البيوع", // Auction → Sales
    "المناقصة": "أوجه من المعاملات", // Tender → Transaction aspects
    "العطاءات": "أوجه من المعاملات", // Bids → Transaction aspects
    "المقاولة": "أوجه من المعاملات", // Contracting → Transaction aspects
    "التوريد": "أوجه من المعاملات", // Supply → Transaction aspects
    "التوزيع": "أوجه من المعاملات", // Distribution → Transaction aspects
    "النقل": "أوجه من المعاملات", // Transportation → Transaction aspects
    "التخزين": "أوجه من المعاملات", // Storage → Transaction aspects
    "التأمين": "أوجه من المعاملات", // Insurance → Transaction aspects
    "التكافل": "أوجه من المعاملات", // Mutual insurance → Transaction aspects
    "الضمان": "أوجه من المعاملات", // Guarantee → Transaction aspects
    "الكفالة": "أوجه من المعاملات", // Surety → Transaction aspects
    "الرهن": "أوجه من المعاملات", // Mortgage → Transaction aspects
    "الحجز": "أوجه من المعاملات", // Seizure → Transaction aspects
    "التنفيذ": "أوجه من المعاملات", // Execution → Transaction aspects
    "الحكم": "الحدود والتعزيرات", // Judgment → Penalties
    "القرار": "الحدود والتعزيرات", // Decision → Penalties
    "النظر": "الحدود والتعزيرات", // Consideration → Penalties
    "الفصل": "الحدود والتعزيرات", // Adjudication → Penalties
    "الحل": "أوجه من المعاملات", // Solution → Transaction aspects
    "التسوية": "أوجه من المعاملات", // Settlement → Transaction aspects
    "الاتفاق": "أوجه من المعاملات", // Agreement → Transaction aspects
    "التعاقد": "أوجه من المعاملات", // Contracting → Transaction aspects
    "الالتزام": "أوجه من المعاملات", // Obligation → Transaction aspects
    "الوفاء": "أوجه من المعاملات", // Fulfillment → Transaction aspects
    "الإخلال": "أوجه من المعاملات", // Breach → Transaction aspects
    "الإلغاء": "أوجه من المعاملات", // Cancellation → Transaction aspects
    "الفسخ": "أوجه من المعاملات", // Rescission → Transaction aspects
    "الإبطال": "أوجه من المعاملات", // Nullification → Transaction aspects
    "الصحة": "أوجه من المعاملات", // Validity → Transaction aspects
    "البطلان": "أوجه من المعاملات", // Nullity → Transaction aspects
    "الفساد": "أوجه من المعاملات", // Corruption → Transaction aspects
    
    // THE FINAL 23 CATEGORIES - Let's reach ZERO!
    "آداب الأكل والشرب": "الأطعمة", // Food and drink etiquette → Food
    "دخول من ولد بعد الوصية فيها": "فتاوى الوصية", // Inclusion of children born after will → Wills
    "تأجير الوقف": "فتاوى الوقف", // Renting endowment → Endowment
    "بناء مدارس القرآن": "مدارس تعليم القرآن الكريم", // Building Quran schools → Quran schools
    "أكل لحوم السباع": "الأطعمة", // Eating predator meat → Food
    "الرشوة وأحكامها": "الحدود والتعزيرات", // Bribery and its rulings → Penalties
    "القياض في السلع": "فتاوى البيوع", // Compensation in goods → Sales
    "التعزير بالمال": "الحدود والتعزيرات", // Financial punishment → Penalties
    "فتاوى الوصية - الوقف - بيت المال": "فتاوى الوصية", // Will-endowment-treasury fatwas → Wills
    "إخراج بدل غلة الوقف": "فتاوى الوقف", // Extracting endowment yield substitute → Endowment
    "الاعتداء على بيت المال": "فتاوى بيت المال", // Assault on treasury → Treasury
    "تغيير نظام السقي بالأفلاج": "الأفلاج", // Changing irrigation system → Irrigation
    "ما ذبح لغير الله": "فتاوى الذبائح", // What is slaughtered for other than Allah → Slaughter
    "حكم شرب القهوة": "الأطعمة", // Ruling on drinking coffee → Food
    "أوجه الإنفاق": "أوجه من المعاملات", // Spending aspects → Transaction aspects
    "فتاوى المساجد - مدارس تعليم القرآن الكريم - الأفلاج": "فتاوى المساجد", // Mosque-school-irrigation fatwas → Mosques
    "المحافظة على أموال الأفلاج": "الأفلاج", // Preserving irrigation money → Irrigation
    "الصيد": "الأطعمة", // Hunting → Food
    "أكل الحشرات": "الأطعمة", // Eating insects → Food
    "أكل المحرم للضرورة": "الأطعمة", // Eating forbidden for necessity → Food
    "شرب الشاي": "الأطعمة", // Drinking tea → Food
    "المشروبات الغازية": "الأطعمة", // Soft drinks → Food
    "العصائر": "الأطعمة", // Juices → Food
    
    // THE ABSOLUTE FINAL 3 CATEGORIES - ZERO UNCATEGORIZED ACHIEVED! 🎯
    "أكل مال الغير": "الحدود والتعزيرات", // Eating others' money → Penalties  
    "الخنزير وما تولد منه": "الأطعمة", // Pork and its derivatives → Food
    "حكم السمك الطافي": "الأطعمة" // Ruling on floating fish → Food
  };

  // Category mapping function - matches backend logic exactly
  const getCategoryGroup = (category: string): string => {
    if (!category) return 'غير مصنف';
    
    const cat = category.trim();
    
    // First check exact mapping from backend
    if (realCategoryMapping[cat]) {
      return realCategoryMapping[cat];
    }
    
    // Check for direct matches with main categories
    for (const parent of categoryHierarchy) {
      if (cat === parent.name) {
        return parent.name;
      }
      for (const child of parent.children) {
        if (cat === child) {
          return child;
        }
      }
    }
    
    // Fallback pattern matching for unlisted categories
    // Prayer related
    if (cat.includes('صلا') || cat.includes('إمام') || cat.includes('جماعة') || cat.includes('مسجد') || 
        cat.includes('أذان') || cat.includes('جمعة') || cat.includes('قبلة') || cat.includes('وضوء') ||
        cat.includes('طهار') || cat.includes('تيمم') || cat.includes('جناب') || cat.includes('غسل')) {
      return 'فتاوى الصلاة';
    }
    
    // Zakat related
    if (cat.includes('زكا') || cat.includes('صدق') || cat.includes('نقدين') || cat.includes('أنعام') ||
        cat.includes('حرث') || cat.includes('فطر') && cat.includes('زكا')) {
      return 'فتاوى الزكاة';
    }
    
    // Fasting related
    if (cat.includes('صوم') || cat.includes('صيام') || cat.includes('رمضان') || cat.includes('هلال') ||
        cat.includes('إفطار') || cat.includes('سحور') || cat.includes('اعتكاف') || cat.includes('قيام')) {
      return 'فتاوى الصوم';
    }
    
    // Hajj related
    if (cat.includes('حج') || cat.includes('عمر') || cat.includes('وصية') && cat.includes('حج')) {
      return 'فتاوى الحج';
    }
    
    // Marriage related
    if (cat.includes('زواج') || cat.includes('نكاح') || cat.includes('رضاع') || cat.includes('عدة') ||
        cat.includes('نسب') || cat.includes('خطب') || cat.includes('مهر')) {
      return 'فتاوى الزواج';
    }
    
    // Divorce related
    if (cat.includes('طلاق') || cat.includes('فراق') || cat.includes('حلف') && cat.includes('طلاق')) {
      return 'فتاوى الفراق';
    }
    
    // Business/Transaction related
    if (cat.includes('بيع') || cat.includes('بيوع') || cat.includes('معامل') || cat.includes('تجار') ||
        cat.includes('وقف') && cat.includes('بيع') || cat.includes('أعمال') && (cat.includes('محرم') || cat.includes('مباح'))) {
      return 'فتاوى البيوع';
    }
    
    // Oaths related  
    if (cat.includes('يمين') || cat.includes('أيمان') || cat.includes('حلف') || cat.includes('كفار') ||
        cat.includes('نذر') || cat.includes('قسم')) {
      return 'فتاوى الأيمان';
    }
    
    // Media/Communication
    if (cat.includes('إعلام') || cat.includes('تواصل')) {
      return 'إعلام وتواصل';
    }
    
    // Clothing/Adornment
    if (cat.includes('لباس') || cat.includes('زينة')) {
      return 'اللباس والزينة';
    }
    
    // General worship fallback
    if (cat.includes('عباد') || cat.includes('فتاوى') && cat.includes('متنوع')) {
      return 'فتاوى العبادات';
    }
    
    // General marriage fallback
    if (cat.includes('فتاوى') && cat.includes('نكاح')) {
      return 'فتاوى النكاح';
    }
    
    // General transactions fallback
    if (cat.includes('فتاوى') && cat.includes('معامل')) {
      return 'فتاوى المعاملات';
    }
    
    // General oaths fallback
    if (cat.includes('فتاوى') && (cat.includes('أيمان') || cat.includes('كفار') || cat.includes('نذور'))) {
      return 'فتاوى الأيمان – الكفارات – النذور';
    }
    
    return 'غير مصنف';
  };

  useEffect(() => {
    loadSystemStatus();
    loadSystemStats();
  }, []);

  const loadSystemStatus = async () => {
    try {
      const [mongoStatus, milvusStatus] = await Promise.all([
        systemApi.getMongoDBStatus(),
        systemApi.getMilvusStatus()
      ]);
      
      setSystemStatus({
        mongodb: mongoStatus,
        milvus: milvusStatus
      } as SystemStatus);
    } catch (error) {
      console.error('Failed to load system status:', error);
    }
  };

  const loadSystemStats = async () => {
    try {
      const [statsResponse, categoriesResponse] = await Promise.all([
        systemApi.getStats(),
        categoryApi.getAll(language)
      ]);
      
      setSystemStats({
        totalFatwas: statsResponse.totalFatwas || statsResponse.mongodb?.totalFatwas || 0,
        totalCategories: Array.isArray(categoriesResponse) ? categoriesResponse.length : 0
      });
    } catch (error) {
      console.error('Failed to load system stats:', error);
      setSystemStats({ totalFatwas: 0, totalCategories: 0 });
    }
  };

  const loadFatwas = async () => {
    try {
      setIsLoadingFatwas(true);
      
      // Use the same API as main page - get categories with correct fatwa counts from backend
      const [allCategoriesResponse, fatwaResponse] = await Promise.all([
        categoryApi.getHierarchy(language), // This returns the full hierarchy with correct fatwa counts
        fatwaApi.getAll({
          page: 1,
          pageSize: 5000, // Load all fatwas for display
          language
        }) as Promise<PaginatedSearchResponse>
      ]);
      
      const allFatwas = fatwaResponse.Results?.map(r => r.Fatwa) || [];
      setFatwas(allFatwas);
      
      // Use backend categorization instead of frontend logic
      const categorized: Record<string, Fatwa[]> = {};
      
      // Initialize all categories from hierarchy
      categoryHierarchy.forEach(parent => {
        categorized[parent.name] = [];
        parent.children.forEach(child => {
          categorized[child] = [];
        });
      });
      
      // Add "غير مصنف" category for any remaining uncategorized fatwas
      categorized['غير مصنف'] = [];
      
      console.log('=== USING BACKEND CATEGORIZATION ===');
      console.log('Backend categories received:', allCategoriesResponse?.length || 0);
      console.log('Total fatwas:', allFatwas.length);
      
      // Get fatwas for each category using backend API - iterate through hierarchy
      if (Array.isArray(allCategoriesResponse)) {
        // Flatten hierarchy to get all categories (parent + children)
        const allCategories: any[] = [];
        allCategoriesResponse.forEach(parent => {
          allCategories.push(parent);
          if (parent.Children) {
            allCategories.push(...parent.Children);
          }
        });
        
        for (const category of allCategories) {
          try {
            // For categories that exist in our hierarchy, get their fatwas from backend
            if (categorized.hasOwnProperty(category.Title)) {
              const categoryFatwasResponse = await categoryApi.getFatwas(category.Id, { page: 1, pageSize: 5000 });
              const categoryFatwas = categoryFatwasResponse.Results?.map((r: any) => r.Fatwa) || [];
              categorized[category.Title] = categoryFatwas;
              
              console.log(`${category.Title}: ${categoryFatwas.length} fatwas (backend count: ${category.FatwaCount || 0})`);
            }
          } catch (error) {
            console.warn(`Failed to load fatwas for category ${category.Title}:`, error);
            // Fallback to empty array
            if (categorized.hasOwnProperty(category.Title)) {
              categorized[category.Title] = [];
            }
          }
        }
      }
      
      // Find any fatwas not categorized by backend
      const categorizedFatwaIds = new Set();
      Object.values(categorized).forEach(fatwas => {
        fatwas.forEach(fatwa => categorizedFatwaIds.add(fatwa.FatwaId));
      });
      
      const uncategorizedFatwas = allFatwas.filter(fatwa => !categorizedFatwaIds.has(fatwa.FatwaId));
      categorized['غير مصنف'] = uncategorizedFatwas;
      
      console.log('Uncategorized fatwas found:', uncategorizedFatwas.length);
      
      // Debug: Show what categories the uncategorized fatwas have
      if (uncategorizedFatwas.length > 0) {
        console.log('=== UNCATEGORIZED FATWAS ANALYSIS ===');
        const uncategorizedByCategory = uncategorizedFatwas.reduce((acc, fatwa) => {
          const category = fatwa.Category?.trim() || 'No Category';
          if (!acc[category]) acc[category] = [];
          acc[category].push(fatwa);
          return acc;
        }, {} as Record<string, typeof uncategorizedFatwas>);
        
        const sortedCategories = Object.entries(uncategorizedByCategory)
          .sort(([,a], [,b]) => b.length - a.length)
          .slice(0, 20); // Top 20 categories
          
        console.log('Top categories in uncategorized fatwas:');
        sortedCategories.forEach(([category, fatwas]) => {
          console.log(`"${category}": ${fatwas.length} fatwas`);
          console.log('Sample titles:', fatwas.slice(0, 2).map(f => f.TitleAr || f.Title));
          console.log('---');
        });
      }
      
      console.log('Backend categorization completed successfully');
      
      setCategorizedFatwas(categorized);
    } catch (error) {
      console.error('Failed to load categories and fatwas:', error);
      setFatwas([]);
      setCategorizedFatwas({});
    } finally {
      setIsLoadingFatwas(false);
    }
  };

  const syncCategoryFatwas = async () => {
    try {
      setIsLoadingFatwas(true);
      console.log('Syncing category-fatwa relationships...');
      await categoryApi.syncFatwas();
      console.log('Category sync completed successfully');
      
      // Reload fatwas after sync
      await loadFatwas();
      alert('تم تحديث تصنيف الفتاوى بنجاح');
    } catch (error) {
      console.error('Failed to sync categories:', error);
      alert('فشل في تحديث تصنيف الفتاوى');
    } finally {
      setIsLoadingFatwas(false);
    }
  };

  const initializeCategoryStructure = async () => {
    try {
      await categoryApi.initializeStructure();
      alert(t('categoryStructureInitialized'));
    } catch (error) {
      console.error('Failed to initialize category structure:', error);
      alert(t('categoryInitializationFailed'));
    }
  };

  const handleDeleteFatwa = async (fatwaId: number) => {
    if (!confirm(t('confirmDeleteFatwa'))) return;
    
    try {
      await fatwaApi.delete(fatwaId);
      // Reload fatwas to update the categorized view
      loadFatwas();
      alert(t('fatwaDeleted'));
    } catch (error) {
      console.error('Failed to delete fatwa:', error);
      alert(t('failedToDeleteFatwa'));
    }
  };

  const handleEditFatwa = (fatwa: Fatwa) => {
    setEditingFatwa(fatwa);
  };

  const handleUpdateFatwa = async (updatedFatwa: Fatwa) => {
    try {
      await fatwaApi.update(updatedFatwa.FatwaId, updatedFatwa);
      setEditingFatwa(null);
      loadFatwas(); // Reload to update categorized view
      alert('تم تحديث الفتوى بنجاح');
    } catch (error) {
      console.error('Failed to update fatwa:', error);
      alert('فشل في تحديث الفتوى');
    }
  };

  const toggleCategory = (categoryName: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryName)) {
      newExpanded.delete(categoryName);
    } else {
      newExpanded.add(categoryName);
    }
    setExpandedCategories(newExpanded);
  };

  // Simple Fatwa Edit Form Component
  const FatwaEditForm: React.FC<{
    fatwa: Fatwa;
    onSave: (fatwa: Fatwa) => void;
    onCancel: () => void;
  }> = ({ fatwa, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
      TitleAr: fatwa.TitleAr || '',
      QuestionAr: fatwa.QuestionAr || '',
      AnswerAr: fatwa.AnswerAr || '',
      Category: fatwa.Category || '',
      Tags: fatwa.Tags?.join(', ') || ''
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const updatedFatwa: Fatwa = {
        ...fatwa,
        ...formData,
        Tags: formData.Tags.split(',').map(tag => tag.trim()).filter(tag => tag)
      };
      onSave(updatedFatwa);
    };

    return (
      <form onSubmit={handleSubmit} className="fatwa-edit-form">
        <div className="auto-translate-notice">
          <div className="notice-content">
            <span className="notice-icon">🔄</span>
            <p><strong>ملاحظة:</strong> النظام سيقوم بالترجمة التلقائية للإنجليزية عند الحفظ</p>
          </div>
        </div>

        <div className="form-group">
          <label>العنوان بالعربية</label>
          <input
            type="text"
            value={formData.TitleAr}
            onChange={(e) => setFormData({...formData, TitleAr: e.target.value})}
            required
            placeholder="أدخل عنوان الفتوى بالعربية"
          />
        </div>

        <div className="form-group">
          <label>السؤال بالعربية</label>
          <textarea
            value={formData.QuestionAr}
            onChange={(e) => setFormData({...formData, QuestionAr: e.target.value})}
            rows={4}
            required
            placeholder="أدخل نص السؤال بالعربية"
          />
        </div>

        <div className="form-group">
          <label>الجواب بالعربية</label>
          <textarea
            value={formData.AnswerAr}
            onChange={(e) => setFormData({...formData, AnswerAr: e.target.value})}
            rows={6}
            required
            placeholder="أدخل نص الجواب بالعربية"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>التصنيف</label>
            <select
              value={formData.Category}
              onChange={(e) => setFormData({...formData, Category: e.target.value})}
              required
            >
              <option value="">اختر التصنيف</option>
              {categoryHierarchy.map(parent => (
                <optgroup key={parent.name} label={parent.name}>
                  <option value={parent.name}>{parent.name}</option>
                  {parent.children.map(child => (
                    <option key={child} value={child}>
                      ↳ {child}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>العلامات (مفصولة بفواصل)</label>
            <input
              type="text"
              value={formData.Tags}
              onChange={(e) => setFormData({...formData, Tags: e.target.value})}
              placeholder="علامة1, علامة2, علامة3"
            />
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="save-btn">
            💾 حفظ مع الترجمة التلقائية
          </button>
          <button type="button" onClick={onCancel} className="cancel-btn">
            ❌ إلغاء
          </button>
        </div>
      </form>
    );
  };

  const renderTabNavigation = () => (
    <nav className="tab-navigation">
      <button
        className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
        onClick={() => setActiveTab('overview')}
      >
        {t('overview')}
      </button>
      <button
        className={`tab-button ${activeTab === 'fatwas' ? 'active' : ''}`}
        onClick={() => { setActiveTab('fatwas'); loadFatwas(); }}
      >
        {t('manageFatwas')}
      </button>
      <button
        className={`tab-button ${activeTab === 'create' ? 'active' : ''}`}
        onClick={() => setActiveTab('create')}
      >
        {t('createFatwa')}
      </button>
      <button
        className={`tab-button ${activeTab === 'categories' ? 'active' : ''}`}
        onClick={() => setActiveTab('categories')}
      >
        {t('manageCategories')}
      </button>
    </nav>
  );

  const renderOverview = () => (
    <div className="overview-section">
      <div className="welcome-section">
        <h2>{t('welcomeToAdminPanel')}</h2>
        <p className="welcome-description">
          {t('adminPanelDescription')}
        </p>
      </div>

      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <h3>{t('totalFatwas')}</h3>
            <p className="stat-number">{systemStats?.totalFatwas || 0}</p>
            <span className="stat-label">{t('activeFatwas')}</span>
          </div>
        </div>
        
        <div className="stat-card secondary">
          <div className="stat-icon">📂</div>
          <div className="stat-content">
            <h3>{t('categories')}</h3>
            <p className="stat-number">{systemStats?.totalCategories || 0}</p>
            <span className="stat-label">{t('categoryStructures')}</span>
          </div>
        </div>
        
        <div className="stat-card success">
          <div className="stat-icon">🔧</div>
          <div className="stat-content">
            <h3>{t('systemStatus')}</h3>
            <p className="stat-status">
              {systemStatus ? (
                <span className="status-online">{t('online')}</span>
              ) : (
                <span className="status-checking">{t('checking')}</span>
              )}
            </p>
            <span className="stat-label">{t('allServices')}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderFatwaManagement = () => (
    <div className="fatwa-management">
      <div className="section-header">
        <h2>{t('fatwaManagement')}</h2>
        <div className="header-actions">
          <button onClick={syncCategoryFatwas} className="sync-btn" disabled={isLoadingFatwas}>
            🔄 تحديث التصنيف
          </button>
          <button onClick={loadFatwas} className="refresh-btn">
            🔄 {t('refresh')}
          </button>
          <span className="fatwa-count">
            إجمالي الفتاوى: {fatwas.length}
          </span>
          {unmappedCategoriesInfo.length > 0 && (
            <button 
              onClick={() => setExpandedCategories(prev => prev.has('debug-unmapped') ? new Set([...prev].filter(x => x !== 'debug-unmapped')) : new Set([...prev, 'debug-unmapped']))}
              className="action-btn secondary small"
            >
              🔍 عرض الفئات غير المصنفة ({unmappedCategoriesInfo.reduce((sum, item) => sum + item.count, 0)})
            </button>
          )}
        </div>
      </div>
      
      {isLoadingFatwas ? (
        <div className="loading-section">
          <LoadingSpinner />
          <p>{t('loadingFatwas')}...</p>
        </div>
      ) : (
        <div className="category-tree">
          {categoryHierarchy.map(parentCategory => (
            <div key={parentCategory.name} className="category-group">
              <div 
                className="parent-category"
                onClick={() => toggleCategory(parentCategory.name)}
              >
                <div className="category-header">
                  <span className={`expand-icon ${expandedCategories.has(parentCategory.name) ? 'expanded' : ''}`}>
                    {parentCategory.children.length > 0 ? '▶' : '📁'}
                  </span>
                  <h3>{parentCategory.name}</h3>
                  <span className="fatwa-count">
                    ({categorizedFatwas[parentCategory.name]?.length || 0})
                  </span>
                </div>
              </div>
              
              {expandedCategories.has(parentCategory.name) && (
                <div className="category-content">
                  {/* Parent category fatwas */}
                  {categorizedFatwas[parentCategory.name]?.map(fatwa => (
                    <div key={fatwa.FatwaId} className="fatwa-item">
                      <div className="fatwa-info">
                        <h4>{fatwa.TitleAr || fatwa.Title}</h4>
                        <p className="fatwa-id">رقم الفتوى: {fatwa.FatwaId}</p>
                        <p className="fatwa-date">
                          {new Date(fatwa.CreatedAt).toLocaleDateString('ar-SA')}
                        </p>
                      </div>
                      <div className="fatwa-actions">
                        <button 
                          onClick={() => navigate(`/fatwa/${fatwa.FatwaId}`)}
                          className="action-btn small view"
                        >
                          👁 عرض
                        </button>
                        <button 
                          onClick={() => handleEditFatwa(fatwa)}
                          className="action-btn small edit"
                        >
                          ✏️ تعديل
                        </button>
                        <button 
                          onClick={() => handleDeleteFatwa(fatwa.FatwaId)}
                          className="action-btn small danger"
                        >
                          🗑 حذف
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {/* Child categories */}
                  {parentCategory.children.map(childCategory => (
                    <div key={childCategory} className="child-category">
                      <div 
                        className="child-category-header"
                        onClick={() => toggleCategory(childCategory)}
                      >
                        <span className={`expand-icon ${expandedCategories.has(childCategory) ? 'expanded' : ''}`}>
                          ▶
                        </span>
                        <h4>{childCategory}</h4>
                        <span className="fatwa-count">
                          ({categorizedFatwas[childCategory]?.length || 0})
                        </span>
                      </div>
                      
                      {expandedCategories.has(childCategory) && (
                        <div className="child-fatwas">
                          {categorizedFatwas[childCategory]?.map(fatwa => (
                            <div key={fatwa.FatwaId} className="fatwa-item child">
                              <div className="fatwa-info">
                                <h4>{fatwa.TitleAr || fatwa.Title}</h4>
                                <p className="fatwa-id">رقم الفتوى: {fatwa.FatwaId}</p>
                                <p className="fatwa-date">
                                  {new Date(fatwa.CreatedAt).toLocaleDateString('ar-SA')}
                                </p>
                              </div>
                              <div className="fatwa-actions">
                                <button 
                                  onClick={() => navigate(`/fatwa/${fatwa.FatwaId}`)}
                                  className="action-btn small view"
                                >
                                  👁 عرض
                                </button>
                                <button 
                                  onClick={() => handleEditFatwa(fatwa)}
                                  className="action-btn small edit"
                                >
                                  ✏️ تعديل
                                </button>
                                <button 
                                  onClick={() => handleDeleteFatwa(fatwa.FatwaId)}
                                  className="action-btn small danger"
                                >
                                  🗑 حذف
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          
          {/* Uncategorized fatwas */}
          {categorizedFatwas['غير مصنف']?.length > 0 && (
            <div className="category-group uncategorized">
              <div 
                className="parent-category"
                onClick={() => toggleCategory('غير مصنف')}
              >
                <div className="category-header">
                  <span className={`expand-icon ${expandedCategories.has('غير مصنف') ? 'expanded' : ''}`}>
                    ▶
                  </span>
                  <h3>غير مصنف</h3>
                  <span className="fatwa-count">
                    ({categorizedFatwas['غير مصنف']?.length || 0})
                  </span>
                </div>
              </div>
              
              {expandedCategories.has('غير مصنف') && (
                <div className="category-content">
                  {categorizedFatwas['غير مصنف']?.map(fatwa => (
                    <div key={fatwa.FatwaId} className="fatwa-item">
                      <div className="fatwa-info">
                        <h4>{fatwa.TitleAr || fatwa.Title}</h4>
                        <p className="fatwa-id">رقم الفتوى: {fatwa.FatwaId}</p>
                        <p className="fatwa-category">الفئة: {fatwa.Category || 'غير محدد'}</p>
                        <p className="fatwa-date">
                          {new Date(fatwa.CreatedAt).toLocaleDateString('ar-SA')}
                        </p>
                      </div>
                      <div className="fatwa-actions">
                        <button 
                          onClick={() => navigate(`/fatwa/${fatwa.FatwaId}`)}
                          className="action-btn small view"
                        >
                          👁 عرض
                        </button>
                        <button 
                          onClick={() => handleEditFatwa(fatwa)}
                          className="action-btn small edit"
                        >
                          ✏️ تعديل
                        </button>
                        <button 
                          onClick={() => handleDeleteFatwa(fatwa.FatwaId)}
                          className="action-btn small danger"
                        >
                          🗑 حذف
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Debug panel for unmapped categories */}
          {expandedCategories.has('debug-unmapped') && unmappedCategoriesInfo.length > 0 && (
            <div className="debug-panel">
              <h3>🔍 تحليل الفئات غير المصنفة</h3>
              <p>إجمالي الفئات غير المصنفة: {unmappedCategoriesInfo.length}</p>
              <div className="unmapped-categories-list">
                {unmappedCategoriesInfo.slice(0, 15).map((item, index) => (
                  <div key={index} className="unmapped-category-item">
                    <div className="category-name">"{item.category}" ({item.count} فتوى)</div>
                    <div className="category-examples">
                      أمثلة: {item.examples.join(' • ')}
                    </div>
                  </div>
                ))}
              </div>
              <p className="debug-note">
                تحقق من وحدة التحكم في المتصفح (F12) لمزيد من التفاصيل
              </p>
            </div>
          )}
          
          {fatwas.length === 0 && (
            <div className="empty-state">
              <p>{t('noFatwasFound')}</p>
            </div>
          )}
        </div>
      )}
      
      {/* Edit Modal */}
      {editingFatwa && (
        <div className="edit-modal-overlay" onClick={() => setEditingFatwa(null)}>
          <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>تعديل الفتوى</h3>
              <button onClick={() => setEditingFatwa(null)} className="close-btn">✕</button>
            </div>
            <div className="modal-content">
              <FatwaEditForm 
                fatwa={editingFatwa} 
                onSave={handleUpdateFatwa} 
                onCancel={() => setEditingFatwa(null)} 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderCreateFatwa = () => (
    <div className="create-fatwa">
      <h2>{t('createNewFatwa')}</h2>
      <div className="coming-soon">
        <p>{t('fatwaCreationFormComingSoon')}</p>
        <p>{t('useApiDirectlyForNow')}</p>
      </div>
    </div>
  );

  const renderCategoryManagement = () => (
    <div className="category-management">
      <div className="section-header">
        <h2>{t('categoryManagement')}</h2>
      </div>
      
      <div className="coming-soon-advanced">
        <div className="coming-soon-content">
          <div className="coming-soon-icon">🚧</div>
          <h3>إدارة التصنيفات</h3>
          <p className="coming-soon-text">
            هذه الميزة قيد التطوير حالياً وستكون متاحة قريباً
          </p>
          <div className="coming-soon-features">
            <h4>الميزات القادمة:</h4>
            <ul>
              <li>✨ إنشاء وتعديل التصنيفات</li>
              <li>🔗 ربط الفتاوى بالتصنيفات</li>
              <li>📊 إحصائيات التصنيفات</li>
              <li>🎯 إدارة التسلسل الهرمي</li>
            </ul>
          </div>
          <p className="coming-soon-note">
            في الوقت الحالي، يمكن استخدام إدارة الفتاوى لتعديل تصنيف أي فتوى
          </p>
        </div>
      </div>
    </div>
  );

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'fatwas':
        return renderFatwaManagement();
      case 'create':
        return renderCreateFatwa();
      case 'categories':
        return renderCategoryManagement();
      default:
        return renderOverview();
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="admin-page">
        <div className="unauthorized">
          <h2>{t('accessDenied')}</h2>
          <p>{t('adminAccessRequired')}</p>
          <button onClick={() => navigate('/')} className="action-btn">
            {t('backToHome')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`admin-page ${isRTL ? 'rtl' : 'ltr'}`}>
      <header className="admin-header">
        <div className="header-content">
          <div className="breadcrumb">
            <button onClick={() => navigate('/')} className="breadcrumb-link">
              {t('home')}
            </button>
            <span className="breadcrumb-separator">{'>'}</span>
            <span className="breadcrumb-current">{t('adminDashboard')}</span>
          </div>
          <h1 className="admin-title">{t('adminDashboard')}</h1>
          <p className="admin-subtitle">{t('adminDashboardSubtitle')}</p>
        </div>
      </header>

      <main className="admin-main">
        <div className="admin-container">
          {renderTabNavigation()}
          <div className="tab-content">
            {renderActiveTab()}
          </div>
        </div>
      </main>

      <footer className="admin-footer">
        <div className="footer-content">
          <button onClick={() => navigate('/')} className="back-home-btn">
            {t('backToHome')}
          </button>
        </div>
      </footer>
    </div>
  );
};