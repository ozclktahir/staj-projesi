import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../locale/locale_provider.dart';

/// Web `t()` benzeri hafif TR/EN sözlük.
class AppStrings {
  const AppStrings._(this.locale, this._map);

  final AppLocaleOption locale;
  final Map<String, String> _map;

  bool get isEnglish => locale == AppLocaleOption.en;

  String t(String key, [Map<String, String>? vars]) {
    var value = _map[key] ?? _tr[key] ?? key;
    if (vars != null) {
      for (final entry in vars.entries) {
        value = value.replaceAll('{${entry.key}}', entry.value);
      }
    }
    return value;
  }

  // —— Shortcuts ——
  String get navDashboard => t('nav.dashboard');
  String get navProjects => t('nav.projects');
  String get navPersonal => t('nav.personal');
  String get navSettings => t('nav.settings');
  String get navMembers => t('nav.members');
  String get navInvite => t('nav.invite');
  String get navLogout => t('nav.logout');

  String get commonCancel => t('common.cancel');
  String get commonDelete => t('common.delete');
  String get commonSave => t('common.save');
  String get commonCreate => t('common.create');
  String get commonRetry => t('common.retry');
  String get commonAccept => t('common.accept');
  String get commonReject => t('common.reject');
  String get commonLoading => t('common.loading');
  String get commonOverview => t('common.overview');
  String get commonNotifications => t('common.notifications');
  String get commonNewProject => t('common.newProject');
  String get commonSelectWorkspace => t('common.selectWorkspace');
  String get commonCreateWorkspace => t('common.createWorkspace');

  String get settingsTitle => t('settings.title');
  String get settingsAppearance => t('settings.appearance');
  String get settingsTheme => t('settings.theme');
  String get settingsThemeLight => t('settings.themeLight');
  String get settingsThemeDark => t('settings.themeDark');
  String get settingsThemeSystem => t('settings.themeSystem');
  String get settingsLanguage => t('settings.language');
  String get settingsLanguageDesc => t('settings.languageDesc');
  String get settingsAppLanguage => t('settings.appLanguage');
  String get settingsMembers => t('settings.members');
  String get settingsMembersDesc => t('settings.membersDesc');
  String get settingsDangerZone => t('settings.dangerZone');
  String get settingsDeleteWorkspace => t('settings.deleteWorkspace');
  String get settingsDeleteWorkspaceTitle => t('settings.deleteWorkspaceTitle');
  String get settingsDeleteWorkspaceBody => t('settings.deleteWorkspaceBody');
  String get settingsWorkspaceDeleted => t('settings.workspaceDeleted');
  String get settingsDeleteFailed => t('settings.deleteFailed');

  String get authLogin => t('auth.login');
  String get authLoginSubtitle => t('auth.loginSubtitle');
  String get authLoginFailed => t('auth.loginFailed');
  String get authNoAccount => t('auth.noAccount');
  String get authRegister => t('auth.register');
  String get authRegisterSubtitle => t('auth.registerSubtitle');
  String get authRegisterFailed => t('auth.registerFailed');
  String get authHaveAccount => t('auth.haveAccount');
  String get authBackToLogin => t('auth.backToLogin');
  String get authCheckingSession => t('auth.checkingSession');

  String get notificationsTitle => t('notifications.title');
  String get notificationsEmpty => t('notifications.empty');
  String get notificationsMarkAll => t('notifications.markAll');
  String get notificationsRefreshFailed => t('notifications.refreshFailed');
  String get notificationsPendingInvites => t('notifications.pendingInvites');
  String get notificationsNoPendingInvites =>
      t('notifications.noPendingInvites');
  String get notificationsInviteFallback => t('notifications.inviteFallback');
  String get notificationsInviteFailed => t('notifications.inviteFailed');
  String get notificationsClaimFailed => t('notifications.claimFailed');
  String get notificationsDeletionFailed => t('notifications.deletionFailed');
  String get notificationsApproveDelete => t('notifications.approveDelete');

  String get activityEmpty => t('activity.empty');
  String get activityUnknownUser => t('activity.unknownUser');
  String get activityTaskFallback => t('activity.taskFallback');

  String activityCreated(String name, String title) =>
      t('activity.created', {'name': name, 'title': title});
  String activityDeleted(String name, String title) =>
      t('activity.deleted', {'name': name, 'title': title});
  String activityStatus(String name, String title, String status) =>
      t('activity.status', {'name': name, 'title': title, 'status': status});
  String activityPriority(String name, String title, String priority) =>
      t('activity.priority', {
        'name': name,
        'title': title,
        'priority': priority,
      });
  String activityAssignee(String name, String title, String assignee) =>
      t('activity.assignee', {
        'name': name,
        'title': title,
        'assignee': assignee,
      });
  String activityComment(String name, String title) =>
      t('activity.comment', {'name': name, 'title': title});
  String activityAttachment(String name, String title, String file) =>
      t('activity.attachment', {
        'name': name,
        'title': title,
        'file': file,
      });
  String activityUpdated(String name, String title) =>
      t('activity.updated', {'name': name, 'title': title});
  String activityClaimAccepted(String name, String title) =>
      t('activity.claimAccepted', {'name': name, 'title': title});
  String activityClaimRejected(String name, String title) =>
      t('activity.claimRejected', {'name': name, 'title': title});
  String activityReassigned(String name, String title, String assignee) =>
      t('activity.reassigned', {
        'name': name,
        'title': title,
        'assignee': assignee,
      });
  String activityGeneric(String name, [String? action]) => action != null &&
          action.isNotEmpty
      ? t('activity.genericAction', {'name': name, 'action': action})
      : t('activity.generic', {'name': name});

  String get homeNoWorkspacesTitle => t('home.noWorkspacesTitle');
  String get homeNoWorkspacesSubtitle => t('home.noWorkspacesSubtitle');
  String get homeSelectWorkspaceTitle => t('home.selectWorkspaceTitle');
  String get homeSelectWorkspaceSubtitle => t('home.selectWorkspaceSubtitle');
  String get homeWorkspacesLoadError => t('home.workspacesLoadError');
  String get homeProjectsLoadError => t('home.projectsLoadError');
  String get navPersonalArea => t('nav.personalArea');

  String get errorsGeneric => t('errors.generic');
  String get errorsInviteSent => t('errors.inviteSent');
  String get errorsProjectCreated => t('errors.projectCreated');
  String get errorsLoadFailed => t('errors.loadFailed');

  String get dashboardNoWorkspace => t('dashboard.noWorkspace');
  String get dashboardTotalTasks => t('dashboard.totalTasks');
  String get dashboardCompletionRate => t('dashboard.completionRate');
  String get dashboardOverdueTasks => t('dashboard.overdueTasks');
  String get dashboardActiveMembers => t('dashboard.activeMembers');
  String get dashboardPriorityDensity => t('dashboard.priorityDensity');
  String get dashboardStatusDist => t('dashboard.statusDist');
  String get dashboardMemberLoad => t('dashboard.memberLoad');
  String get dashboardRecentActivity => t('dashboard.recentActivity');

  String get personalTabAssigned => t('personal.tabAssigned');
  String get personalTabNotes => t('personal.tabNotes');
  String get personalTabTodos => t('personal.tabTodos');
  String get personalTabFiles => t('personal.tabFiles');
  String get personalSearchTasks => t('personal.searchTasks');
  String get personalTitle => t('personal.title');
  String get personalEdit => t('personal.edit');
  String get personalFileUploaded => t('personal.fileUploaded');

  String get membersTitle => t('members.title');
  String get membersLoadError => t('members.loadError');
  String get membersEmpty => t('members.empty');
  String membersCount(int n) => t('members.count', {'n': '$n'});

  String get projectDelete => t('project.delete');
  String get projectTaskCreated => t('project.taskCreated');
  String get projectActivity => t('project.activity');
  String get projectLoadMore => t('project.loadMore');

  String get trashTitle => t('trash.title');
  String get trashEmptyTitle => t('trash.emptyTitle');
  String get trashEmptySubtitle => t('trash.emptySubtitle');
  String get trashLoadError => t('trash.loadError');
  String get trashRestore => t('trash.restore');
  String get trashRestored => t('trash.restored');
  String trashDeletedAt(String at) => t('trash.deletedAt', {'at': at});

  String get adminTitle => t('admin.title');
  String get adminStatsSection => t('admin.statsSection');
  String get adminMembersSection => t('admin.membersSection');
  String get adminTotalUsers => t('admin.totalUsers');
  String get adminActiveTasks => t('admin.activeTasks');
  String get adminTotalProjects => t('admin.totalProjects');
  String get adminRemoveMember => t('admin.removeMember');
  String adminRemoveMemberBody(String name) =>
      t('admin.removeMemberBody', {'name': name});
  String get adminMemberRemoved => t('admin.memberRemoved');
  String get adminForbiddenTitle => t('admin.forbiddenTitle');
  String get adminForbiddenSubtitle => t('admin.forbiddenSubtitle');

  String get progressTitle => t('progress.title');
  String get progressCreate => t('progress.create');
  String get progressEmptyTitle => t('progress.emptyTitle');
  String get progressEmptySubtitle => t('progress.emptySubtitle');
  String get progressLoadError => t('progress.loadError');
  String get progressType => t('progress.type');
  String get progressTitleField => t('progress.titleField');
  String get progressContentField => t('progress.contentField');
  String get progressCreated => t('progress.created');

  String get settingsTrash => t('settings.trash');
  String get settingsTrashDesc => t('settings.trashDesc');
  String get settingsAdmin => t('settings.admin');
  String get settingsAdminDesc => t('settings.adminDesc');
  String get settingsProgress => t('settings.progress');
  String get settingsProgressDesc => t('settings.progressDesc');

  String get splashBrand => t('splash.brand');

  String get statusTodo => t('common.statusTodo');
  String get statusInProgress => t('common.statusInProgress');
  String get statusDone => t('common.statusDone');
  String get priorityLow => t('common.priorityLow');
  String get priorityMedium => t('common.priorityMedium');
  String get priorityHigh => t('common.priorityHigh');
  String get priorityUrgent => t('common.priorityUrgent');

  factory AppStrings.ofLocale(AppLocaleOption locale) {
    return AppStrings._(locale, locale == AppLocaleOption.en ? _en : _tr);
  }

  static AppStrings of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<_AppStringsScope>();
    return scope?.strings ?? AppStrings.ofLocale(AppLocaleOption.tr);
  }

  static const Map<String, String> _tr = {
    'nav.dashboard': 'Dashboard',
    'nav.projects': 'Projeler',
    'nav.personal': 'Kişisel',
    'nav.personalArea': 'Kişisel alan',
    'nav.settings': 'Ayarlar',
    'nav.members': 'Üyeler',
    'nav.invite': 'Üye davet et',
    'nav.logout': 'Çıkış yap',
    'home.noWorkspacesTitle': 'Henüz çalışma alanınız yok',
    'home.noWorkspacesSubtitle': 'Başlamak için bir çalışma alanı oluşturun.',
    'home.selectWorkspaceTitle': 'Çalışma alanı seçin',
    'home.selectWorkspaceSubtitle':
        'Devam etmek için bir çalışma alanı seçmeniz gerekiyor.',
    'home.workspacesLoadError': 'Çalışma alanları yüklenemedi',
    'home.projectsLoadError': 'Projeler yüklenemedi',
    'common.cancel': 'İptal',
    'common.delete': 'Sil',
    'common.save': 'Kaydet',
    'common.create': 'Oluştur',
    'common.retry': 'Tekrar dene',
    'common.accept': 'Kabul Et',
    'common.reject': 'Reddet',
    'common.loading': 'Yükleniyor…',
    'common.overview': 'Genel bakış',
    'common.notifications': 'Bildirimler',
    'common.newProject': 'Yeni proje',
    'common.selectWorkspace': 'Çalışma alanı seç',
    'common.createWorkspace': 'Çalışma alanı oluştur',
    'common.statusTodo': 'Yapılacaklar',
    'common.statusInProgress': 'Devam Edenler',
    'common.statusDone': 'Tamamlananlar',
    'common.priorityLow': 'Düşük',
    'common.priorityMedium': 'Orta',
    'common.priorityHigh': 'Yüksek',
    'common.priorityUrgent': 'Acil',
    'settings.title': 'Ayarlar',
    'settings.appearance': 'Görünüm',
    'settings.theme': 'Tema',
    'settings.themeLight': 'Açık',
    'settings.themeDark': 'Koyu',
    'settings.themeSystem': 'Sistem',
    'settings.language': 'Dil',
    'settings.languageDesc':
        'Arayüz dilini seçin. Tercih cihazda saklanır ve yeniden açılışta korunur.',
    'settings.appLanguage': 'Uygulama dili',
    'settings.members': 'Üyeler',
    'settings.membersDesc': 'Çalışma alanı üyelerini görüntüle',
    'settings.dangerZone': 'Tehlikeli bölge',
    'settings.deleteWorkspace': 'Çalışma Alanını Sil',
    'settings.deleteWorkspaceTitle': 'Çalışma alanını sil',
    'settings.deleteWorkspaceBody':
        '"{name}" kalıcı olarak silinecek. Bu işlem geri alınamaz. Devam etmek istiyor musunuz?',
    'settings.workspaceDeleted': 'Çalışma alanı silindi.',
    'settings.deleteFailed': 'Silinemedi.',
    'auth.login': 'Giriş Yap',
    'auth.loginSubtitle': 'Hesabına giriş yaparak devam et',
    'auth.loginFailed': 'Giriş başarısız.',
    'auth.noAccount': 'Hesabın yok mu? Kayıt ol',
    'auth.register': 'Kayıt Ol',
    'auth.registerSubtitle': 'Yeni hesap oluştur',
    'auth.registerFailed': 'Kayıt başarısız.',
    'auth.haveAccount': 'Zaten hesabın var mı? Giriş yap',
    'auth.backToLogin': 'Girişe dön',
    'auth.checkingSession': 'Oturum kontrol ediliyor…',
    'notifications.title': 'Bildirimler',
    'notifications.empty': 'Bildirim yok.',
    'notifications.markAll': 'Tümünü okundu',
    'notifications.refreshFailed': 'Bildirimler güncellenemedi.',
    'notifications.pendingInvites': 'Bekleyen davetler',
    'notifications.noPendingInvites': 'Bekleyen davet yok.',
    'notifications.inviteFallback': 'Çalışma alanı daveti',
    'notifications.inviteFailed': 'Davet işlemi başarısız oldu.',
    'notifications.claimFailed': 'Sahiplenme yanıtı başarısız oldu.',
    'notifications.deletionFailed': 'Silme onayı yanıtı başarısız oldu.',
    'notifications.approveDelete': 'Onayla ve sil',
    'activity.empty': 'Henüz aktivite kaydı yok',
    'activity.unknownUser': 'Bilinmeyen Kullanıcı',
    'activity.taskFallback': 'görev',
    'activity.created': '{name} "{title}" görevini oluşturdu',
    'activity.deleted': '{name} "{title}" görevini sildi',
    'activity.status':
        '{name} "{title}" görevini "{status}" olarak işaretledi',
    'activity.priority':
        '{name} "{title}" önceliğini "{priority}" yaptı',
    'activity.assignee': '{name} "{title}" görevini {assignee} atadı',
    'activity.comment': '{name} "{title}" görevine yorum ekledi',
    'activity.attachment':
        '{name} "{title}" görevine {file} ekledi',
    'activity.updated': '{name} "{title}" görevini güncelledi',
    'activity.claimAccepted':
        '{name}, \'{title}\' görevini kabul etti ve üzerinde çalışmaya başladı.',
    'activity.claimRejected':
        '{name}, kendisine atanan \'{title}\' görevini reddetti.',
    'activity.reassigned':
        '{name}, reddedilen \'{title}\' görevini {assignee}\'na yeniden atadı.',
    'activity.generic': '{name} bir işlem yaptı',
    'activity.genericAction': '{name} bir işlem yaptı ({action})',
    'errors.generic': 'Bir hata oluştu.',
    'errors.inviteSent': 'Davet gönderildi.',
    'errors.projectCreated': 'Proje oluşturuldu.',
    'errors.loadFailed': 'Veriler yüklenemedi.',
    'dashboard.noWorkspace': 'Workspace seçilmedi',
    'dashboard.totalTasks': 'Toplam Görev',
    'dashboard.completionRate': 'Tamamlanma Oranı',
    'dashboard.overdueTasks': 'Geciken Görevler',
    'dashboard.activeMembers': 'Aktif Üyeler',
    'dashboard.statusDist': 'Durum Dağılımı',
    'dashboard.memberLoad': 'Üye İş Yükü',
    'dashboard.priorityDensity': 'Öncelik Yoğunluğu',
    'dashboard.recentActivity': 'Son Aktiviteler',
    'personal.tabAssigned': 'Atanan',
    'personal.tabNotes': 'Notlar',
    'personal.tabTodos': 'Todos',
    'personal.tabFiles': 'Dosyalar',
    'personal.searchTasks': 'Görev ara…',
    'personal.title': 'Başlık',
    'personal.edit': 'Düzenle',
    'personal.fileUploaded': 'Dosya yüklendi.',
    'members.title': 'Üyeler',
    'members.loadError': 'Üyeler yüklenemedi',
    'members.empty': 'Üye yok',
    'members.count': '{n} üye',
    'project.delete': 'Projeyi sil',
    'project.taskCreated': 'Görev oluşturuldu.',
    'project.activity': 'Aktivite',
    'project.loadMore': 'Daha fazla yükle',
    'trash.title': 'Çöp kutusu',
    'trash.emptyTitle': 'Çöp kutusu boş',
    'trash.emptySubtitle': 'Silinen görevler burada görünür.',
    'trash.loadError': 'Çöp kutusu yüklenemedi',
    'trash.restore': 'Geri yükle',
    'trash.restored': 'Görev geri yüklendi.',
    'trash.deletedAt': 'Silindi: {at}',
    'admin.title': 'Yönetim',
    'admin.statsSection': 'İstatistikler',
    'admin.membersSection': 'Üye yönetimi',
    'admin.totalUsers': 'Toplam üye',
    'admin.activeTasks': 'Aktif görev',
    'admin.totalProjects': 'Proje',
    'admin.removeMember': 'Üyeyi kaldır',
    'admin.removeMemberBody': '"{name}" çalışma alanından kaldırılsın mı?',
    'admin.memberRemoved': 'Üye kaldırıldı.',
    'admin.forbiddenTitle': 'Yetki yok',
    'admin.forbiddenSubtitle': 'Bu sayfa yalnızca admin / owner içindir.',
    'progress.title': 'İlerleme raporları',
    'progress.create': 'Rapor oluştur',
    'progress.emptyTitle': 'Henüz rapor yok',
    'progress.emptySubtitle': 'Günlük / haftalık / aylık rapor ekleyin.',
    'progress.loadError': 'Raporlar yüklenemedi',
    'progress.type': 'Tür',
    'progress.titleField': 'Başlık',
    'progress.contentField': 'İçerik',
    'progress.created': 'Rapor oluşturuldu.',
    'settings.trash': 'Çöp kutusu',
    'settings.trashDesc': 'Silinen görevleri geri yükle',
    'settings.admin': 'Yönetim paneli',
    'settings.adminDesc': 'İstatistikler ve üye kaldırma',
    'settings.progress': 'İlerleme raporları',
    'settings.progressDesc': 'Günlük / haftalık / aylık raporlar',
    'splash.brand': 'Workspace',
  };

  static const Map<String, String> _en = {
    'nav.dashboard': 'Dashboard',
    'nav.projects': 'Projects',
    'nav.personal': 'Personal',
    'nav.personalArea': 'Personal space',
    'nav.settings': 'Settings',
    'nav.members': 'Members',
    'nav.invite': 'Invite member',
    'nav.logout': 'Log out',
    'home.noWorkspacesTitle': 'No workspaces yet',
    'home.noWorkspacesSubtitle': 'Create a workspace to get started.',
    'home.selectWorkspaceTitle': 'Select a workspace',
    'home.selectWorkspaceSubtitle':
        'Choose a workspace to continue.',
    'home.workspacesLoadError': 'Could not load workspaces',
    'home.projectsLoadError': 'Could not load projects',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.save': 'Save',
    'common.create': 'Create',
    'common.retry': 'Try again',
    'common.accept': 'Accept',
    'common.reject': 'Reject',
    'common.loading': 'Loading…',
    'common.overview': 'Overview',
    'common.notifications': 'Notifications',
    'common.newProject': 'New project',
    'common.selectWorkspace': 'Select workspace',
    'common.createWorkspace': 'Create workspace',
    'common.statusTodo': 'To do',
    'common.statusInProgress': 'In progress',
    'common.statusDone': 'Done',
    'common.priorityLow': 'Low',
    'common.priorityMedium': 'Medium',
    'common.priorityHigh': 'High',
    'common.priorityUrgent': 'Urgent',
    'settings.title': 'Settings',
    'settings.appearance': 'Appearance',
    'settings.theme': 'Theme',
    'settings.themeLight': 'Light',
    'settings.themeDark': 'Dark',
    'settings.themeSystem': 'System',
    'settings.language': 'Language',
    'settings.languageDesc':
        'Choose the interface language. Preference is stored on this device.',
    'settings.appLanguage': 'App language',
    'settings.members': 'Members',
    'settings.membersDesc': 'View workspace members',
    'settings.dangerZone': 'Danger zone',
    'settings.deleteWorkspace': 'Delete workspace',
    'settings.deleteWorkspaceTitle': 'Delete workspace',
    'settings.deleteWorkspaceBody':
        '"{name}" will be permanently deleted. This cannot be undone. Continue?',
    'settings.workspaceDeleted': 'Workspace deleted.',
    'settings.deleteFailed': 'Could not delete.',
    'auth.login': 'Sign in',
    'auth.loginSubtitle': 'Sign in to continue',
    'auth.loginFailed': 'Sign-in failed.',
    'auth.noAccount': "Don't have an account? Sign up",
    'auth.register': 'Sign up',
    'auth.registerSubtitle': 'Create a new account',
    'auth.registerFailed': 'Sign-up failed.',
    'auth.haveAccount': 'Already have an account? Sign in',
    'auth.backToLogin': 'Back to sign in',
    'auth.checkingSession': 'Checking session…',
    'notifications.title': 'Notifications',
    'notifications.empty': 'No notifications.',
    'notifications.markAll': 'Mark all read',
    'notifications.refreshFailed': 'Could not refresh notifications.',
    'notifications.pendingInvites': 'Pending invites',
    'notifications.noPendingInvites': 'No pending invites.',
    'notifications.inviteFallback': 'Workspace invite',
    'notifications.inviteFailed': 'Invite action failed.',
    'notifications.claimFailed': 'Claim response failed.',
    'notifications.deletionFailed': 'Deletion approval failed.',
    'notifications.approveDelete': 'Approve & delete',
    'activity.empty': 'No activity yet',
    'activity.unknownUser': 'Unknown user',
    'activity.taskFallback': 'task',
    'activity.created': '{name} created task "{title}"',
    'activity.deleted': '{name} deleted task "{title}"',
    'activity.status': '{name} marked "{title}" as "{status}"',
    'activity.priority': '{name} set priority of "{title}" to "{priority}"',
    'activity.assignee': '{name} assigned "{title}" to {assignee}',
    'activity.comment': '{name} commented on "{title}"',
    'activity.attachment': '{name} attached {file} to "{title}"',
    'activity.updated': '{name} updated task "{title}"',
    'activity.claimAccepted':
        '{name} accepted \'{title}\' and started working on it.',
    'activity.claimRejected': '{name} rejected assigned task \'{title}\'.',
    'activity.reassigned':
        '{name} reassigned rejected task \'{title}\' to {assignee}.',
    'activity.generic': '{name} performed an action',
    'activity.genericAction': '{name} performed an action ({action})',
    'errors.generic': 'Something went wrong.',
    'errors.inviteSent': 'Invite sent.',
    'errors.projectCreated': 'Project created.',
    'errors.loadFailed': 'Could not load data.',
    'dashboard.noWorkspace': 'No workspace selected',
    'dashboard.totalTasks': 'Total tasks',
    'dashboard.completionRate': 'Completion rate',
    'dashboard.overdueTasks': 'Overdue tasks',
    'dashboard.activeMembers': 'Active members',
    'dashboard.statusDist': 'Status distribution',
    'dashboard.memberLoad': 'Member workload',
    'dashboard.priorityDensity': 'Priority density',
    'dashboard.recentActivity': 'Recent activity',
    'personal.tabAssigned': 'Assigned',
    'personal.tabNotes': 'Notes',
    'personal.tabTodos': 'Todos',
    'personal.tabFiles': 'Files',
    'personal.searchTasks': 'Search tasks…',
    'personal.title': 'Title',
    'personal.edit': 'Edit',
    'personal.fileUploaded': 'File uploaded.',
    'members.title': 'Members',
    'members.loadError': 'Could not load members',
    'members.empty': 'No members',
    'members.count': '{n} members',
    'project.delete': 'Delete project',
    'project.taskCreated': 'Task created.',
    'project.activity': 'Activity',
    'project.loadMore': 'Load more',
    'trash.title': 'Trash',
    'trash.emptyTitle': 'Trash is empty',
    'trash.emptySubtitle': 'Deleted tasks appear here.',
    'trash.loadError': 'Could not load trash',
    'trash.restore': 'Restore',
    'trash.restored': 'Task restored.',
    'trash.deletedAt': 'Deleted: {at}',
    'admin.title': 'Admin',
    'admin.statsSection': 'Statistics',
    'admin.membersSection': 'Member management',
    'admin.totalUsers': 'Total members',
    'admin.activeTasks': 'Active tasks',
    'admin.totalProjects': 'Projects',
    'admin.removeMember': 'Remove member',
    'admin.removeMemberBody': 'Remove "{name}" from this workspace?',
    'admin.memberRemoved': 'Member removed.',
    'admin.forbiddenTitle': 'No access',
    'admin.forbiddenSubtitle': 'This page is for admins / owners only.',
    'progress.title': 'Progress reports',
    'progress.create': 'Create report',
    'progress.emptyTitle': 'No reports yet',
    'progress.emptySubtitle': 'Add daily / weekly / monthly reports.',
    'progress.loadError': 'Could not load reports',
    'progress.type': 'Type',
    'progress.titleField': 'Title',
    'progress.contentField': 'Content',
    'progress.created': 'Report created.',
    'settings.trash': 'Trash',
    'settings.trashDesc': 'Restore deleted tasks',
    'settings.admin': 'Admin panel',
    'settings.adminDesc': 'Stats and remove members',
    'settings.progress': 'Progress reports',
    'settings.progressDesc': 'Daily / weekly / monthly reports',
    'splash.brand': 'Workspace',
  };
}

class _AppStringsScope extends InheritedWidget {
  const _AppStringsScope({
    required this.strings,
    required super.child,
  });

  final AppStrings strings;

  @override
  bool updateShouldNotify(_AppStringsScope oldWidget) {
    return oldWidget.strings.locale != strings.locale;
  }
}

/// MaterialApp builder ile sarmalamak için.
Widget wrapWithAppStrings({
  required AppStrings strings,
  required Widget child,
}) {
  return _AppStringsScope(strings: strings, child: child);
}

final appStringsProvider = Provider<AppStrings>((ref) {
  final locale = ref.watch(localePreferenceProvider);
  return AppStrings.ofLocale(locale);
});
