# Daily Report — 2 Ağustos 2026

## Summary
Closed the mobile gap list: JWT refresh (Nest + Flutter), trash list/restore, admin stats/remove member, progress reports UI, i18n expansion, dead notes cleanup, error UX, splash polish, RBAC tests, and lightweight workspace offline cache.

## Backend
- `POST /auth/refresh`
- `GET /workspaces/:workspaceId/tasks/deleted`
- Admin routes accept `OWNER` as well as `Admin`

## Mobile
- Silent refresh interceptor + bootstrap renew
- Screens: Trash, Admin, Progress reports (via Settings)
- Removed unused `flutter_dotenv` and orphaned workspace-notes client code
- Providers rethrow load errors (AsyncError instead of empty list)
- Unit tests: `workspace_rbac_test.dart`, `api_constants_test.dart`

## Notes
- Physical device: keep Nest running; with USB use `adb reverse tcp:3000 tcp:3000` and `API_BASE_URL=http://localhost:3000`
