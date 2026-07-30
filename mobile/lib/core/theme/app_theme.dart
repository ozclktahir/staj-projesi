import 'package:flutter/material.dart';

/// Web `globals.css` / shadcn token’larıyla hizalı Material 3 teması.
///
/// Light primary: `#ea580c` · Dark primary: `#ff6a00`
/// Radius: `8.0` (= web `--radius: 0.5rem`)
/// Border: light `#cbd5e1` (slate-300) · dark `#1e293b` (slate-800)
abstract final class AppTheme {
  static const double radius = 8;

  // —— Light (html.light) ——
  static const Color lightBackground = Color(0xFFFFFFFF);
  static const Color lightForeground = Color(0xFF0F172A);
  static const Color lightCard = Color(0xFFF8FAFC);
  static const Color lightPrimary = Color(0xFFEA580C);
  static const Color lightPrimaryForeground = Color(0xFFFFFFFF);
  static const Color lightSecondary = Color(0xFF2563EB);
  static const Color lightMuted = Color(0xFFF1F5F9);
  static const Color lightMutedForeground = Color(0xFF475569);
  static const Color lightBorder = Color(0xFFCBD5E1);
  static const Color lightDestructive = Color(0xFFDC2626);
  static const Color lightAccent = Color(0xFFDBEAFE);

  // —— Dark (html.dark) ——
  static const Color darkBackground = Color(0xFF0A0A0A);
  static const Color darkForeground = Color(0xFFF8FAFC);
  static const Color darkCard = Color(0xFF121212);
  static const Color darkPrimary = Color(0xFFFF6A00);
  static const Color darkPrimaryForeground = Color(0xFFFFFFFF);
  static const Color darkSecondary = Color(0xFF1E293B);
  static const Color darkMuted = Color(0xFF1E293B);
  static const Color darkMutedForeground = Color(0xFF94A3B8);
  static const Color darkBorder = Color(0xFF1E293B);
  static const Color darkDestructive = Color(0xFF7F1D1D);

  static BorderRadius get borderRadius => BorderRadius.circular(radius);

  static RoundedRectangleBorder get shape =>
      RoundedRectangleBorder(borderRadius: borderRadius);

  static ThemeData get light {
    final scheme = ColorScheme(
      brightness: Brightness.light,
      primary: lightPrimary,
      onPrimary: lightPrimaryForeground,
      secondary: lightSecondary,
      onSecondary: lightPrimaryForeground,
      error: lightDestructive,
      onError: lightPrimaryForeground,
      surface: lightBackground,
      onSurface: lightForeground,
      surfaceContainerHighest: lightCard,
      surfaceContainerLow: lightMuted,
      outline: lightBorder,
      outlineVariant: lightBorder,
      tertiary: lightSecondary,
      onTertiary: lightPrimaryForeground,
    );

    return _base(scheme, cardColor: lightCard, inputFill: lightBackground);
  }

  static ThemeData get dark {
    final scheme = ColorScheme(
      brightness: Brightness.dark,
      primary: darkPrimary,
      onPrimary: darkPrimaryForeground,
      secondary: darkSecondary,
      onSecondary: darkForeground,
      error: darkDestructive,
      onError: darkForeground,
      surface: darkBackground,
      onSurface: darkForeground,
      surfaceContainerHighest: darkCard,
      surfaceContainerLow: darkMuted,
      outline: darkBorder,
      outlineVariant: darkBorder,
      tertiary: darkPrimary,
      onTertiary: darkPrimaryForeground,
    );

    return _base(scheme, cardColor: darkCard, inputFill: darkCard);
  }

  static ThemeData _base(
    ColorScheme scheme, {
    required Color cardColor,
    required Color inputFill,
  }) {
    final textTheme = Typography.material2021(
      platform: TargetPlatform.android,
    ).black.apply(
      bodyColor: scheme.onSurface,
      displayColor: scheme.onSurface,
    );

    final resolvedText = scheme.brightness == Brightness.dark
        ? Typography.material2021(platform: TargetPlatform.android).white.apply(
            bodyColor: scheme.onSurface,
            displayColor: scheme.onSurface,
          )
        : textTheme;

    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: scheme.surface,
      canvasColor: scheme.surface,
      cardColor: cardColor,
      dividerColor: scheme.outline,
      textTheme: resolvedText,
      appBarTheme: AppBarTheme(
        centerTitle: false,
        elevation: 0,
        scrolledUnderElevation: 0.5,
        backgroundColor: scheme.surface,
        foregroundColor: scheme.onSurface,
        surfaceTintColor: Colors.transparent,
        shape: Border(
          bottom: BorderSide(color: scheme.outline, width: 1),
        ),
      ),
      cardTheme: CardThemeData(
        color: cardColor,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: borderRadius,
          side: BorderSide(
            color: scheme.outline,
            width: scheme.brightness == Brightness.light ? 1.5 : 1,
          ),
        ),
        margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: inputFill,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: borderRadius,
          borderSide: BorderSide(
            color: scheme.outline,
            width: scheme.brightness == Brightness.light ? 2 : 1,
          ),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: borderRadius,
          borderSide: BorderSide(
            color: scheme.outline,
            width: scheme.brightness == Brightness.light ? 2 : 1,
          ),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: borderRadius,
          borderSide: BorderSide(color: scheme.primary, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: borderRadius,
          borderSide: BorderSide(
            color: scheme.error,
            width: scheme.brightness == Brightness.light ? 2 : 1,
          ),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: borderRadius,
          borderSide: BorderSide(color: scheme.error, width: 2),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: scheme.primary,
          foregroundColor: scheme.onPrimary,
          minimumSize: const Size.fromHeight(44),
          shape: shape,
          elevation: 0,
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: scheme.primary,
          foregroundColor: scheme.onPrimary,
          minimumSize: const Size.fromHeight(44),
          shape: shape,
          elevation: 0,
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: scheme.onSurface,
          minimumSize: const Size.fromHeight(44),
          shape: shape,
          side: BorderSide(color: scheme.outline),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: scheme.primary,
          shape: shape,
        ),
      ),
      floatingActionButtonTheme: FloatingActionButtonThemeData(
        backgroundColor: scheme.primary,
        foregroundColor: scheme.onPrimary,
        elevation: 2,
        shape: shape,
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: cardColor,
        surfaceTintColor: Colors.transparent,
        shape: shape,
      ),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: cardColor,
        surfaceTintColor: Colors.transparent,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(radius)),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: scheme.surface,
        indicatorColor: scheme.primary.withValues(alpha: 0.15),
        surfaceTintColor: Colors.transparent,
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return TextStyle(
            fontSize: 12,
            fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
            color: selected ? scheme.primary : scheme.onSurfaceVariant,
          );
        }),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return IconThemeData(
            color: selected ? scheme.primary : scheme.onSurfaceVariant,
          );
        }),
      ),
      chipTheme: ChipThemeData(
        shape: RoundedRectangleBorder(borderRadius: borderRadius),
        side: BorderSide(color: scheme.outline),
        selectedColor: scheme.primary.withValues(alpha: 0.15),
        checkmarkColor: scheme.primary,
        labelStyle: TextStyle(color: scheme.onSurface),
      ),
      segmentedButtonTheme: SegmentedButtonThemeData(
        style: ButtonStyle(
          shape: WidgetStatePropertyAll(shape),
          side: WidgetStatePropertyAll(BorderSide(color: scheme.outline)),
          backgroundColor: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.selected)) {
              return scheme.primary.withValues(alpha: 0.15);
            }
            return null;
          }),
          foregroundColor: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.selected)) {
              return scheme.primary;
            }
            return scheme.onSurface;
          }),
        ),
      ),
      dividerTheme: DividerThemeData(
        color: scheme.outline,
        thickness: 1,
        space: 1,
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        shape: shape,
      ),
      progressIndicatorTheme: ProgressIndicatorThemeData(
        color: scheme.primary,
      ),
      listTileTheme: ListTileThemeData(
        shape: shape,
        iconColor: scheme.onSurfaceVariant,
      ),
      drawerTheme: DrawerThemeData(
        backgroundColor: scheme.surface,
        surfaceTintColor: Colors.transparent,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.horizontal(right: Radius.circular(radius)),
        ),
      ),
      tabBarTheme: TabBarThemeData(
        labelColor: scheme.primary,
        unselectedLabelColor: scheme.onSurfaceVariant,
        indicatorColor: scheme.primary,
        dividerColor: scheme.outline,
      ),
    );
  }
}
