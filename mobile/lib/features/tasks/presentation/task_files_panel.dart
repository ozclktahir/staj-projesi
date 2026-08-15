import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/constants/upload_limits.dart';
import '../data/file_repository.dart';
import '../data/task_scope.dart';
import '../providers/file_provider.dart';

class TaskFilesPanel extends ConsumerStatefulWidget {
  const TaskFilesPanel({super.key, required this.scope});

  final TaskScope scope;

  @override
  ConsumerState<TaskFilesPanel> createState() => _TaskFilesPanelState();
}

class _TaskFilesPanelState extends ConsumerState<TaskFilesPanel> {
  var _uploading = false;

  Future<void> _pickAndUpload() async {
    if (_uploading) return;

    final result = await FilePicker.platform.pickFiles(withData: true);
    if (result == null || result.files.isEmpty) return;

    final file = result.files.single;
    if (file.size > UploadLimits.maxFileBytes) {
      if (mounted) {
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(
            SnackBar(
              content: Text(
                'Dosya çok büyük (${UploadLimits.formatBytes(file.size)}). '
                'En fazla ${UploadLimits.formatBytes(UploadLimits.maxFileBytes)} yükleyebilirsiniz.',
              ),
            ),
          );
      }
      return;
    }

    setState(() => _uploading = true);
    try {
      await ref.read(taskFilesProvider(widget.scope).notifier).upload(
            fileName: file.name,
            filePath: file.path,
            bytes: file.bytes,
            mimeType: file.extension != null
                ? _guessMime(file.extension!)
                : null,
          );
      if (mounted) {
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(
            const SnackBar(content: Text('Dosya yüklendi.')),
          );
      }
    } on FileException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(SnackBar(content: Text(error.message)));
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(
            const SnackBar(content: Text('Dosya yüklenemedi.')),
          );
      }
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  Future<void> _openFile(String url) async {
    final uri = Uri.tryParse(url);
    if (uri == null) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(const SnackBar(content: Text('Geçersiz dosya URL\'i.')));
      return;
    }
    final ok = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!ok && mounted) {
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(const SnackBar(content: Text('Dosya açılamadı.')));
    }
  }

  Future<void> _deleteFile(String fileId, String fileName) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Dosyayı sil'),
        content: Text('"$fileName" silinsin mi?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('İptal'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('Sil'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    try {
      await ref
          .read(taskFilesProvider(widget.scope).notifier)
          .deleteFile(fileId);
      if (mounted) {
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(const SnackBar(content: Text('Dosya silindi.')));
      }
    } on FileException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(SnackBar(content: Text(error.message)));
      }
    }
  }

  String? _guessMime(String extension) {
    switch (extension.toLowerCase()) {
      case 'png':
        return 'image/png';
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'pdf':
        return 'application/pdf';
      case 'txt':
        return 'text/plain';
      default:
        return null;
    }
  }

  @override
  Widget build(BuildContext context) {
    final filesAsync = ref.watch(taskFilesProvider(widget.scope));

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 12, 12, 8),
          child: FilledButton.icon(
            onPressed: _uploading ? null : _pickAndUpload,
            icon: _uploading
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.upload_file),
            label: Text(_uploading ? 'Yükleniyor…' : 'Dosya seç ve yükle'),
          ),
        ),
        Expanded(
          child: filesAsync.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (error, _) => Center(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(error.toString(), textAlign: TextAlign.center),
                    const SizedBox(height: 8),
                    FilledButton(
                      onPressed: () => ref
                          .read(taskFilesProvider(widget.scope).notifier)
                          .refresh(),
                      child: const Text('Tekrar dene'),
                    ),
                  ],
                ),
              ),
            ),
            data: (files) {
              if (files.isEmpty) {
                return const Center(
                  child: Text('Bu göreve henüz dosya eklenmemiş.'),
                );
              }
              return ListView.separated(
                padding: const EdgeInsets.fromLTRB(12, 0, 12, 16),
                itemCount: files.length,
                separatorBuilder: (_, _) => const Divider(height: 1),
                itemBuilder: (context, index) {
                  final file = files[index];
                  return ListTile(
                    leading: const Icon(Icons.insert_drive_file_outlined),
                    title: Text(file.fileName),
                    subtitle: Text(
                      file.fileUrl,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    onTap: file.fileUrl.isEmpty
                        ? null
                        : () => _openFile(file.fileUrl),
                    trailing: IconButton(
                      tooltip: 'Sil',
                      onPressed: () => _deleteFile(file.id, file.fileName),
                      icon: const Icon(Icons.delete_outline),
                    ),
                  );
                },
              );
            },
          ),
        ),
      ],
    );
  }
}
