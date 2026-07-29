import 'package:dio/dio.dart';

import '../../../core/constants/api_constants.dart';
import '../../../core/network/api_client.dart';
import 'invitation_dto.dart';

class InvitationException implements Exception {
  InvitationException(this.message);

  final String message;

  @override
  String toString() => message;
}

class InvitationRepository {
  InvitationRepository({required ApiClient apiClient}) : _dio = apiClient.dio;

  final Dio _dio;

  /// `POST /workspace/:wId/invite`
  Future<InvitationDto> sendInvite({
    required String workspaceId,
    required InviteMemberRequest request,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        ApiConstants.workspaceInvite(workspaceId),
        data: request.toJson(),
      );
      final data = response.data;
      if (data == null) {
        throw InvitationException('Davet oluşturulamadı.');
      }
      return InvitationDto.fromJson(data);
    } on DioException catch (error) {
      throw InvitationException(_messageFromDio(error));
    }
  }

  /// `GET /invitations/me`
  Future<List<InvitationDto>> fetchMyInvitations() async {
    try {
      final response = await _dio.get<dynamic>(ApiConstants.invitationsMe);
      final data = response.data;
      if (data is! List) {
        throw InvitationException('Davet listesi beklenmeyen formatta.');
      }
      return data
          .whereType<Map>()
          .map((item) => InvitationDto.fromJson(Map<String, dynamic>.from(item)))
          .toList();
    } on DioException catch (error) {
      throw InvitationException(_messageFromDio(error));
    }
  }

  /// `POST /invitations/:id/accept`
  Future<void> accept(String invitationId) async {
    try {
      await _dio.post<void>(ApiConstants.invitationAccept(invitationId));
    } on DioException catch (error) {
      throw InvitationException(_messageFromDio(error));
    }
  }

  /// `POST /invitations/:id/reject`
  Future<void> reject(String invitationId) async {
    try {
      await _dio.post<void>(ApiConstants.invitationReject(invitationId));
    } on DioException catch (error) {
      throw InvitationException(_messageFromDio(error));
    }
  }

  String _messageFromDio(DioException error) {
    final status = error.response?.statusCode;
    final data = error.response?.data;

    if (data is Map) {
      final message = data['message'];
      if (message is String && message.isNotEmpty) return message;
      if (message is List && message.isNotEmpty) {
        return message.map((e) => e.toString()).join(', ');
      }
    }

    if (status == 401) {
      return 'Oturum süresi dolmuş olabilir. Tekrar giriş yapın.';
    }
    if (status == 403) return 'Bu işlem için yetkiniz yok.';
    if (status == 404) return 'Davet bulunamadı.';
    if (error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.receiveTimeout ||
        error.type == DioExceptionType.connectionError) {
      return 'Sunucuya bağlanılamadı.';
    }
    return 'Davet işlemi başarısız oldu.';
  }
}
