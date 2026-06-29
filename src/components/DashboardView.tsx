import React, { useState, useRef, useEffect } from 'react';
import { AppEntry, AppCategory } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { storage } from '../lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { isFirebaseConfigured } from '../lib/firebase';

const CATEGORY_ICONS: Record<string, string> = {
  'إنتاجية': 'calendar_today',
  'مالية': 'account_balance_wallet',
  'أدوات': 'build',
  'ترفيه': 'sports_esports',
  'تعليم': 'school',
  'عام': 'apps',
};

const CATEGORIES: AppCategory[] = ['إنتاجية', 'مالية', 'أدوات', 'ترفيه', 'تعليم'];

interface DashboardProps {
  onAction: (msg: string) => void;
  isAdmin: boolean;
}

export const DashboardView: React.FC<DashboardProps> = ({ onAction, isAdmin }) => {
  const [apps, setApps] = useState<AppEntry[]>([]);
  const [filteredApps, setFilteredApps] = useState<AppEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');

  // Form state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [newAppName, setNewAppName] = useState('');
  const [newAppDesc, setNewAppDesc] = useState('');
  const [newAppCategory, setNewAppCategory] = useState<AppCategory>('أدوات');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Edit State
  const [editingApp, setEditingApp] = useState<AppEntry | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCategory, setEditCategory] = useState<AppCategory>('أدوات');
  const [editFile, setEditFile] = useState<File | null>(null);
  const [isEditingProgress, setIsEditingProgress] = useState(false);
  const [editProgress, setEditProgress] = useState(0);

  // Settings State & UI Toggle
  const [showSettings, setShowSettings] = useState(false);
  const [supabaseUrl, setSupabaseUrl] = useState(localStorage.getItem('supabase_url') || '');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(localStorage.getItem('supabase_anon_key') || '');
  const [firebaseApiKey, setFirebaseApiKey] = useState(localStorage.getItem('firebase_api_key') || '');
  const [firebaseAuthDomain, setFirebaseAuthDomain] = useState(localStorage.getItem('firebase_auth_domain') || '');
  const [firebaseProjectId, setFirebaseProjectId] = useState(localStorage.getItem('firebase_project_id') || '');
  const [firebaseStorageBucket, setFirebaseStorageBucket] = useState(localStorage.getItem('firebase_storage_bucket') || '');
  const [firebaseMessagingSenderId, setFirebaseMessagingSenderId] = useState(localStorage.getItem('firebase_messaging_sender_id') || '');
  const [firebaseAppId, setFirebaseAppId] = useState(localStorage.getItem('firebase_app_id') || '');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchApps();
  }, []);

  useEffect(() => {
    // Apply search & category filters
    let result = [...apps];
    if (selectedCategory !== 'الكل') {
      result = result.filter(app => app.category === selectedCategory);
    }
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      result = result.filter(app => 
        app.name.toLowerCase().includes(term) || 
        app.description.toLowerCase().includes(term)
      );
    }
    setFilteredApps(result);
  }, [apps, searchTerm, selectedCategory]);

  const fetchApps = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('apps')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (data) {
        const formattedApps: AppEntry[] = data.map(app => ({
          id: app.id,
          name: app.name,
          description: app.description || 'بدون وصف',
          category: app.category || 'عام',
          date: new Date(app.created_at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' }),
          iconName: CATEGORY_ICONS[app.category] || 'deployed_code',
          downloadUrl: app.download_url
        }));
        setApps(formattedApps);
      }
    } catch (error: any) {
      console.error('Error fetching apps:', error);
      onAction('فشل في جلب التطبيقات من قاعدة البيانات');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setEditFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!newAppName.trim()) {
      onAction('يرجى إدخال اسم التطبيق أولاً');
      return;
    }
    if (!selectedFile) {
      onAction('يرجى اختيار ملف التطبيق (APK)');
      return;
    }
    if (!isFirebaseConfigured() || !storage) {
      onAction('يرجى تهيئة إعدادات Firebase في قسم الإعدادات أولاً');
      return;
    }
    
    if (!isSupabaseConfigured()) {
      onAction('ملاحظة: سيتم حفظ التطبيق محلياً في المتصفح لأن Supabase غير مهيأ بعد.');
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // 1. Upload to Firebase Storage
      const storageRef = ref(storage, `apps/${Date.now()}_${selectedFile.name}`);
      const uploadTask = uploadBytesResumable(storageRef, selectedFile);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(Math.round(progress));
        },
        (error) => {
          console.error("Upload failed", error);
          onAction('حدث خطأ أثناء رفع الملف إلى Firebase Storage');
          setIsUploading(false);
        },
        async () => {
          try {
            // Upload completed successfully, get download URL
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            
            // 2. Save to Supabase
            const { data, error } = await supabase
              .from('apps')
              .insert([
                { 
                  name: newAppName, 
                  description: newAppDesc || 'تطبيق جديد تم رفعه بنجاح.',
                  category: newAppCategory,
                  download_url: downloadURL 
                }
              ])
              .select();

            if (error) throw error;

            // 3. Update local state
            if (data && data.length > 0) {
              const newApp: AppEntry = {
                id: data[0].id,
                name: data[0].name,
                description: data[0].description,
                category: data[0].category,
                date: new Date(data[0].created_at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' }),
                iconName: CATEGORY_ICONS[data[0].category] || 'deployed_code',
                downloadUrl: data[0].download_url
              };
              setApps([newApp, ...apps]);
            }

            setNewAppName('');
            setNewAppDesc('');
            setSelectedFile(null);
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
            onAction('تم رفع وتثبيت التطبيق بنجاح');
          } catch (err: any) {
            console.error(err);
            onAction(`فشل حفظ التطبيق في Supabase: ${err.message || err}`);
          } finally {
            setIsUploading(false);
          }
        }
      );
    } catch (error: any) {
      console.error(error);
      onAction('حدث خطأ غير متوقع أثناء المعالجة');
      setIsUploading(false);
    }
  };

  const handleEditInit = (app: AppEntry) => {
    setEditingApp(app);
    setEditName(app.name);
    setEditDesc(app.description);
    setEditCategory(app.category);
    setEditFile(null);
    if (editFileInputRef.current) {
      editFileInputRef.current.value = '';
    }
  };

  const handleUpdate = async () => {
    if (!editingApp) return;
    if (!editName.trim()) {
      onAction('يرجى إدخال اسم التطبيق');
      return;
    }

    setIsEditingProgress(true);
    setEditProgress(0);

    try {
      let finalDownloadUrl = editingApp.downloadUrl;

      // If a new file is uploaded
      if (editFile) {
        if (!isFirebaseConfigured() || !storage) {
          onAction('يرجى تهيئة إعدادات Firebase لتحديث الملف');
          setIsEditingProgress(false);
          return;
        }

        // Optional: Clean up older file from Storage if needed
        if (editingApp.downloadUrl) {
          await deleteFromStorage(editingApp.downloadUrl);
        }

        const storageRef = ref(storage, `apps/${Date.now()}_${editFile.name}`);
        const uploadTask = uploadBytesResumable(storageRef, editFile);

        await new Promise<void>((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setEditProgress(Math.round(progress));
            },
            (error) => {
              reject(error);
            },
            async () => {
              finalDownloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
              resolve();
            }
          );
        });
      }

      // Update Database
      const { error } = await supabase
        .from('apps')
        .update({
          name: editName,
          description: editDesc,
          category: editCategory,
          download_url: finalDownloadUrl
        })
        .eq('id', editingApp.id);

      if (error) throw error;

      onAction('تم تحديث بيانات التطبيق بنجاح');
      setEditingApp(null);
      fetchApps();
    } catch (err: any) {
      console.error(err);
      onAction(`فشل التحديث: ${err.message || err}`);
    } finally {
      setIsEditingProgress(false);
    }
  };

  const deleteFromStorage = async (downloadUrl: string) => {
    try {
      if (!storage || !downloadUrl) return;
      const decodedUrl = decodeURIComponent(downloadUrl);
      const parts = decodedUrl.split('/o/');
      if (parts.length > 1) {
        const pathWithToken = parts[1];
        const filePath = pathWithToken.split('?')[0];
        const fileRef = ref(storage, filePath);
        await deleteObject(fileRef);
      }
    } catch (error) {
      console.error('Error clean up older file from Firebase storage:', error);
    }
  };

  const handleDelete = async (app: AppEntry) => {
    if (!window.confirm(`هل أنت متأكد من رغبتك في حذف تطبيق "${app.name}" نهائياً؟`)) {
      return;
    }

    try {
      // 1. Delete from Firebase Storage if downloadUrl is valid
      if (app.downloadUrl) {
        await deleteFromStorage(app.downloadUrl);
      }

      // 2. Delete from Supabase
      const { error } = await supabase
        .from('apps')
        .delete()
        .eq('id', app.id);

      if (error) throw error;

      onAction('تم حذف التطبيق بنجاح');
      setApps(apps.filter(item => item.id !== app.id));
    } catch (err: any) {
      console.error(err);
      onAction(`فشل الحذف: ${err.message || err}`);
    }
  };

  const saveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('supabase_url', supabaseUrl.trim());
    localStorage.setItem('supabase_anon_key', supabaseAnonKey.trim());
    localStorage.setItem('firebase_api_key', firebaseApiKey.trim());
    localStorage.setItem('firebase_auth_domain', firebaseAuthDomain.trim());
    localStorage.setItem('firebase_project_id', firebaseProjectId.trim());
    localStorage.setItem('firebase_storage_bucket', firebaseStorageBucket.trim());
    localStorage.setItem('firebase_messaging_sender_id', firebaseMessagingSenderId.trim());
    localStorage.setItem('firebase_app_id', firebaseAppId.trim());

    onAction('تم حفظ الإعدادات بنجاح. سيتم الآن تحديث الصفحة.');
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  };

  const clearSettings = () => {
    if (window.confirm('هل أنت متأكد من إزالة جميع الإعدادات المحفوظة محلياً؟')) {
      localStorage.clear();
      onAction('تم تفريغ الإعدادات، يرجى إعادة تعيينها.');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  const supabaseOk = isSupabaseConfigured();
  const firebaseOk = isFirebaseConfigured();

  return (
    <div className="space-y-12">
      {/* Top Banner & Settings Access */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface-container rounded-2xl p-6 border border-outline-variant">
        <div className="text-right">
          <h2 className="text-xl font-bold text-on-surface">مرحباً بك في إدارة تطبيقاتي</h2>
          <p className="text-sm text-on-surface-variant mt-1">تأكد من اكتمال الربط الخارجي لجميع الميزات بنجاح.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all border shadow-sm ${
              showSettings 
                ? 'bg-primary text-on-primary border-primary' 
                : 'bg-surface-container-lowest text-on-surface border-outline-variant hover:bg-surface-container-low'
            }`}
          >
            <span className="material-symbols-outlined text-lg">settings</span>
            إعدادات المنصة والربط
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.section 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-surface-container-low border border-outline-variant rounded-2xl p-6 md:p-8 space-y-6"
          >
            <div className="flex justify-between items-center border-b border-outline-variant pb-4">
              <button 
                onClick={clearSettings}
                className="text-xs font-bold text-error hover:underline flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">delete_forever</span>
                تصفير الإعدادات المحفوظة
              </button>
              <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">cloud_sync</span>
                إدارة مفاتيح الربط الخارجي (Supabase & Firebase)
              </h3>
            </div>

            {/* Connection status pills */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className={`p-4 rounded-xl border flex items-center justify-between ${supabaseOk ? 'bg-success-container/10 border-success/30 text-success' : 'bg-error-container/10 border-error/30 text-error'}`}>
                <span className="text-sm font-bold">{supabaseOk ? 'متصل بنجاح' : 'غير متصل أو مفتاح افتراضي'}</span>
                <span className="flex items-center gap-2 font-semibold text-sm">
                  قاعدة بيانات Supabase
                  <span className={`w-2.5 h-2.5 rounded-full ${supabaseOk ? 'bg-success animate-pulse' : 'bg-error'}`}></span>
                </span>
              </div>
              <div className={`p-4 rounded-xl border flex items-center justify-between ${firebaseOk ? 'bg-success-container/10 border-success/30 text-success' : 'bg-error-container/10 border-error/30 text-error'}`}>
                <span className="text-sm font-bold">{firebaseOk ? 'متصل بنجاح' : 'غير متصل أو مفتاح افتراضي'}</span>
                <span className="flex items-center gap-2 font-semibold text-sm">
                  رفع وتخزين Firebase Storage
                  <span className={`w-2.5 h-2.5 rounded-full ${firebaseOk ? 'bg-success animate-pulse' : 'bg-error'}`}></span>
                </span>
              </div>
            </div>

            <form onSubmit={saveSettings} className="space-y-6 text-right">
              <div className="space-y-4">
                <h4 className="font-bold text-primary text-sm">مفاتيح قاعدة بيانات Supabase</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-on-surface-variant">VITE_SUPABASE_URL</label>
                    <input 
                      type="text" 
                      value={supabaseUrl}
                      onChange={(e) => setSupabaseUrl(e.target.value)}
                      placeholder="https://your-project.supabase.co"
                      className="bg-surface border border-outline-variant rounded-lg p-3 text-sm focus:border-primary outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-on-surface-variant">VITE_SUPABASE_ANON_KEY</label>
                    <input 
                      type="password" 
                      value={supabaseAnonKey}
                      onChange={(e) => setSupabaseAnonKey(e.target.value)}
                      placeholder="eyJhbGciOi..."
                      className="bg-surface border border-outline-variant rounded-lg p-3 text-sm focus:border-primary outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-outline-variant">
                <h4 className="font-bold text-primary text-sm">مفاتيح Firebase Storage</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-on-surface-variant">API Key</label>
                    <input 
                      type="text" 
                      value={firebaseApiKey}
                      onChange={(e) => setFirebaseApiKey(e.target.value)}
                      placeholder="AIzaSyB..."
                      className="bg-surface border border-outline-variant rounded-lg p-3 text-sm focus:border-primary outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-on-surface-variant">Auth Domain</label>
                    <input 
                      type="text" 
                      value={firebaseAuthDomain}
                      onChange={(e) => setFirebaseAuthDomain(e.target.value)}
                      placeholder="project.firebaseapp.com"
                      className="bg-surface border border-outline-variant rounded-lg p-3 text-sm focus:border-primary outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-on-surface-variant">Project ID</label>
                    <input 
                      type="text" 
                      value={firebaseProjectId}
                      onChange={(e) => setFirebaseProjectId(e.target.value)}
                      placeholder="project-id"
                      className="bg-surface border border-outline-variant rounded-lg p-3 text-sm focus:border-primary outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-on-surface-variant">Storage Bucket</label>
                    <input 
                      type="text" 
                      value={firebaseStorageBucket}
                      onChange={(e) => setFirebaseStorageBucket(e.target.value)}
                      placeholder="project.firebasestorage.app"
                      className="bg-surface border border-outline-variant rounded-lg p-3 text-sm focus:border-primary outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-on-surface-variant">Messaging Sender ID</label>
                    <input 
                      type="text" 
                      value={firebaseMessagingSenderId}
                      onChange={(e) => setFirebaseMessagingSenderId(e.target.value)}
                      placeholder="123456789"
                      className="bg-surface border border-outline-variant rounded-lg p-3 text-sm focus:border-primary outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-on-surface-variant">App ID</label>
                    <input 
                      type="text" 
                      value={firebaseAppId}
                      onChange={(e) => setFirebaseAppId(e.target.value)}
                      placeholder="1:1234:web:abcd"
                      className="bg-surface border border-outline-variant rounded-lg p-3 text-sm focus:border-primary outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button 
                  type="submit"
                  className="bg-primary text-on-primary font-bold px-8 py-3 rounded-xl hover:bg-primary-container transition-all active:scale-[0.98]"
                >
                  حفظ المفاتيح وإعادة تحميل الصفحة
                </button>
              </div>
            </form>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Upload Form Section (Admin Only) */}
      {isAdmin && (
        <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant p-6 md:p-8 shadow-sm text-right space-y-6">
          <div className="border-b border-outline-variant pb-4">
            <h1 className="text-2xl font-bold text-primary mb-1">رفع تطبيق جديد</h1>
            <p className="text-sm text-on-surface-variant">أضف اسماً، وصفاً، فئة، وملف APK الخاص بالتطبيق لبدء النشر.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-on-surface" htmlFor="appName">اسم التطبيق</label>
              <input
                className="bg-surface border border-outline-variant rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                id="appName"
                value={newAppName}
                onChange={(e) => setNewAppName(e.target.value)}
                placeholder="مثال: تطبيق الملاحظات السريعة"
                type="text"
                disabled={isUploading}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-on-surface" htmlFor="appCategory">تصنيف التطبيق</label>
              <select
                id="appCategory"
                value={newAppCategory}
                onChange={(e) => setNewAppCategory(e.target.value as AppCategory)}
                className="bg-surface border border-outline-variant rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none transition-all"
                disabled={isUploading}
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 flex flex-col gap-2">
              <label className="text-sm font-semibold text-on-surface" htmlFor="appDesc">وصف التطبيق</label>
              <textarea
                className="bg-surface border border-outline-variant rounded-xl px-4 py-3 h-28 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none"
                id="appDesc"
                value={newAppDesc}
                onChange={(e) => setNewAppDesc(e.target.value)}
                placeholder="اكتب وصفاً جذاباً وشاملاً عن ميزات التطبيق..."
                disabled={isUploading}
              />
            </div>

            <div className="md:col-span-2 flex flex-col gap-2">
              <label className="text-sm font-semibold text-on-surface">ملف التطبيق (.apk)</label>
              <div className="relative group/file">
                <input 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed" 
                  id="appFile" 
                  type="file" 
                  disabled={isUploading}
                  accept=".apk"
                  onChange={handleFileChange}
                  ref={fileInputRef}
                />
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-outline-variant rounded-xl p-8 bg-surface-container-low group-hover/file:bg-surface-container transition-all text-center">
                  <span className="material-symbols-outlined text-4xl text-outline mb-2 group-hover/file:text-primary transition-colors">cloud_upload</span>
                  <p className="text-base font-medium text-on-surface">
                    {selectedFile ? selectedFile.name : 'اسحب وأفلت ملف APK هنا، أو اضغط للتصفح'}
                  </p>
                  {selectedFile && (
                    <p className="text-xs text-primary font-bold mt-2">
                      حجم الملف: {(selectedFile.size / (1024 * 1024)).toFixed(2)} ميجابايت
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-outline-variant">
            <div className="w-2/3">
              {isUploading && (
                <div className="space-y-1.5 text-right">
                  <div className="flex justify-between items-center text-xs font-bold text-primary">
                    <span>{uploadProgress}%</span>
                    <span>جاري رفع وتأمين الملف...</span>
                  </div>
                  <div className="w-full bg-surface-container rounded-full h-2 overflow-hidden">
                    <div className="bg-primary h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                </div>
              )}
            </div>

            <button 
              onClick={handleUpload}
              disabled={isUploading}
              className={`bg-primary text-on-primary text-sm font-bold py-3 px-8 rounded-xl shadow-sm hover:bg-primary-container hover:shadow-md transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50`}
            >
              <span className="material-symbols-outlined text-lg">deployed_code</span>
              {isUploading ? 'جاري رفع التطبيق...' : 'نشر وتثبيت التطبيق'}
            </button>
          </div>
        </section>
      )}

      {/* Editing App Modal */}
      <AnimatePresence>
        {editingApp && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 md:p-8 w-full max-w-2xl text-right space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center border-b border-outline-variant pb-4">
                <button 
                  onClick={() => setEditingApp(null)}
                  className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
                <h3 className="text-xl font-bold text-on-surface">تعديل بيانات التطبيق</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold">اسم التطبيق</label>
                  <input 
                    type="text" 
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="bg-surface border border-outline-variant rounded-lg p-3 text-sm focus:border-primary outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold">تصنيف التطبيق</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as AppCategory)}
                    className="bg-surface border border-outline-variant rounded-lg p-3 text-sm focus:border-primary outline-none"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2 flex flex-col gap-1.5">
                  <label className="text-sm font-semibold">الوصف</label>
                  <textarea 
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="bg-surface border border-outline-variant rounded-lg p-3 text-sm focus:border-primary h-24 outline-none resize-none"
                  />
                </div>
                <div className="md:col-span-2 flex flex-col gap-1.5">
                  <label className="text-sm font-semibold">ملف APK جديد (اختياري، اتركه فارغاً للحفاظ على الملف الحالي)</label>
                  <input 
                    type="file" 
                    accept=".apk"
                    onChange={handleEditFileChange}
                    ref={editFileInputRef}
                    className="bg-surface border border-outline-variant rounded-lg p-2.5 text-sm file:bg-primary/10 file:border-none file:text-primary file:font-bold file:px-3 file:py-1 file:rounded file:cursor-pointer"
                  />
                </div>
              </div>

              {isEditingProgress && (
                <div className="space-y-1 text-right">
                  <div className="flex justify-between text-xs text-primary font-bold">
                    <span>{editProgress}%</span>
                    <span>جاري رفع وتحديث الملف...</span>
                  </div>
                  <div className="w-full bg-surface-container rounded-full h-1.5 overflow-hidden">
                    <div className="bg-primary h-full" style={{ width: `${editProgress}%` }}></div>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-outline-variant flex justify-end gap-3">
                <button 
                  onClick={() => setEditingApp(null)}
                  className="px-5 py-2.5 rounded-lg border border-outline-variant hover:bg-surface-container transition-all font-semibold text-sm text-on-surface"
                >
                  إلغاء
                </button>
                <button 
                  onClick={handleUpdate}
                  disabled={isEditingProgress}
                  className="px-6 py-2.5 rounded-lg bg-primary text-on-primary hover:bg-primary-container transition-all font-bold text-sm"
                >
                  حفظ التعديلات
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Applications Grid Section with Advanced Filter */}
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant pb-4">
          <div className="flex flex-wrap items-center gap-2" dir="rtl">
            <button
              onClick={() => setSelectedCategory('الكل')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                selectedCategory === 'الكل' 
                  ? 'bg-primary text-on-primary' 
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              الكل ({apps.length})
            </button>
            {CATEGORIES.map(cat => {
              const count = apps.filter(a => a.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    selectedCategory === cat 
                      ? 'bg-primary text-on-primary' 
                      : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>

          <div className="relative w-full md:w-72">
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث باسم التطبيق أو وصفه..."
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl pl-10 pr-4 py-2.5 text-sm text-on-surface focus:ring-2 focus:ring-primary outline-none text-right"
            />
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-outline text-lg">search</span>
          </div>
        </div>

        {isLoading ? (
          <div className="py-20 text-center space-y-4">
            <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto"></div>
            <p className="text-sm font-semibold text-on-surface-variant">جاري تحميل وتزامن التطبيقات المرفوعة...</p>
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="py-20 text-center border border-dashed border-outline-variant rounded-2xl bg-surface-container-low">
            <span className="material-symbols-outlined text-5xl text-outline mb-3">folder_open</span>
            <h3 className="text-lg font-bold text-on-surface">لا توجد تطبيقات</h3>
            <p className="text-sm text-on-surface-variant mt-1">لم يتم العثور على أي تطبيق يطابق خيارات البحث.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredApps.map((app) => (
                <motion.div 
                  layout
                  key={app.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 flex flex-col hover:shadow-lg hover:-translate-y-0.5 transition-all group text-right relative"
                >
                  {/* Action Buttons for Admins */}
                  {isAdmin && (
                    <div className="absolute left-4 top-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                      <button 
                        onClick={() => handleEditInit(app)}
                        className="w-8 h-8 rounded-full bg-surface-container text-on-surface-variant hover:bg-primary/10 hover:text-primary flex items-center justify-center transition-colors shadow-sm"
                        title="تعديل التطبيق"
                      >
                        <span className="material-symbols-outlined text-sm">edit</span>
                      </button>
                      <button 
                        onClick={() => handleDelete(app)}
                        className="w-8 h-8 rounded-full bg-surface-container text-on-surface-variant hover:bg-error/10 hover:text-error flex items-center justify-center transition-colors shadow-sm"
                        title="حذف التطبيق"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  )}

                  <div className="flex justify-between items-start mb-6">
                    <div className="w-14 h-14 bg-primary-container/10 rounded-xl overflow-hidden flex items-center justify-center transition-transform group-hover:scale-105">
                      <span className="material-symbols-outlined text-primary text-3xl">{app.iconName || 'deployed_code'}</span>
                    </div>
                    <span className="bg-surface-container text-on-surface-variant px-3 py-1 rounded-full text-xs font-medium">{app.category}</span>
                  </div>

                  <h3 className="text-xl font-bold text-on-surface mb-1 group-hover:text-primary transition-colors">{app.name}</h3>
                  <p className="text-sm text-on-surface-variant flex-grow mb-8 leading-relaxed h-12 overflow-hidden text-ellipsis line-clamp-2">{app.description}</p>
                  
                  <div className="pt-4 border-t border-outline-variant flex justify-between items-center mt-auto">
                    {app.downloadUrl ? (
                      <a 
                        href={app.downloadUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="flex items-center gap-2 bg-primary/5 text-primary border border-primary/20 px-5 py-2.5 rounded-xl hover:bg-primary hover:text-on-primary transition-all text-xs font-bold active:scale-95 shadow-sm"
                      >
                        <span className="material-symbols-outlined text-sm">download</span>
                        تحميل APK
                      </a>
                    ) : (
                      <button className="flex items-center gap-2 bg-primary/5 text-primary border border-primary/20 px-5 py-2.5 rounded-xl transition-all text-xs font-bold opacity-50 cursor-not-allowed">
                        غير متوفر
                      </button>
                    )}
                    <span className="text-outline text-xs font-medium">{app.date}</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>
    </div>
  );
};
