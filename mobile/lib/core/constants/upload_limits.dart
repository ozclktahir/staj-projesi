/// Storage/backend yükleme limiti (bkz. `increase_storage_upload_limits_50mb.sql`,
/// `backend/src/file/file.controller.ts` Multer `fileSize`). İstemci tarafında
/// erken/dostane bir uyarı için — web'de yaşanan 25MB/50MB tutarsızlığının
/// mobil karşılığı yaşanmasın diye tek yerde tutuluyor.
abstract final class UploadLimits {
  static const int maxFileBytes = 50 * 1024 * 1024;

  static String formatBytes(int bytes) {
    if (bytes >= 1024 * 1024) {
      return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
    }
    if (bytes >= 1024) {
      return '${(bytes / 1024).toStringAsFixed(0)} KB';
    }
    return '$bytes B';
  }
}
