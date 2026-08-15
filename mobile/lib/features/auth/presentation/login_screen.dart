import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/l10n/app_strings.dart';
import '../../../core/router/app_router.dart';
import '../../../core/widgets/auth_split_shell.dart';
import '../providers/auth_provider.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();
    if (!(_formKey.currentState?.validate() ?? false)) return;

    final ok = await ref.read(authProvider.notifier).login(
          email: _emailController.text,
          password: _passwordController.text,
        );

    if (!mounted) return;

    if (!ok) {
      final s = ref.read(appStringsProvider);
      final message =
          ref.read(authProvider).errorMessage ?? s.authLoginFailed;
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(SnackBar(content: Text(message)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);
    final busy = auth.isSubmitting;
    final s = ref.watch(appStringsProvider);

    if (auth.status == AuthStatus.mfaPending) {
      return const AuthSplitShell(child: _MfaChallengeCard());
    }

    return AuthSplitShell(
      child: AuthFormCard(
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                s.authLogin,
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                s.authLoginSubtitle,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: const Color(0xFFA1A1AA),
                    ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 28),
              TextFormField(
                controller: _emailController,
                enabled: !busy,
                keyboardType: TextInputType.emailAddress,
                autofillHints: const [AutofillHints.email],
                textInputAction: TextInputAction.next,
                style: const TextStyle(color: Colors.white),
                decoration: InputDecoration(
                  labelText: s.isEnglish ? 'Email' : 'E-posta',
                ),
                validator: (value) {
                  final email = value?.trim() ?? '';
                  if (email.isEmpty) {
                    return s.isEnglish
                        ? 'Email is required'
                        : 'E-posta zorunludur';
                  }
                  final ok =
                      RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(email);
                  if (!ok) {
                    return s.isEnglish
                        ? 'Enter a valid email'
                        : 'Geçerli bir e-posta girin';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _passwordController,
                enabled: !busy,
                obscureText: _obscurePassword,
                autofillHints: const [AutofillHints.password],
                textInputAction: TextInputAction.done,
                onFieldSubmitted: (_) => _submit(),
                style: const TextStyle(color: Colors.white),
                decoration: InputDecoration(
                  labelText: s.isEnglish ? 'Password' : 'Şifre',
                  suffixIcon: IconButton(
                    onPressed: busy
                        ? null
                        : () => setState(
                              () => _obscurePassword = !_obscurePassword,
                            ),
                    icon: Icon(
                      _obscurePassword
                          ? Icons.visibility
                          : Icons.visibility_off,
                    ),
                  ),
                ),
                validator: (value) {
                  final password = value ?? '';
                  if (password.isEmpty) {
                    return s.isEnglish
                        ? 'Password is required'
                        : 'Şifre zorunludur';
                  }
                  if (password.length < 6) {
                    return s.isEnglish
                        ? 'Password must be at least 6 characters'
                        : 'Şifre en az 6 karakter olmalıdır';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 24),
              FilledButton(
                onPressed: busy ? null : _submit,
                child: busy
                    ? SizedBox(
                        height: 22,
                        width: 22,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Theme.of(context).colorScheme.onPrimary,
                        ),
                      )
                    : Text(s.authLogin),
              ),
              const SizedBox(height: 12),
              TextButton(
                onPressed:
                    busy ? null : () => context.push(AppRoutes.register),
                child: Text(s.authNoAccount),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Şifre doğrulandıktan sonra TOTP kodu isteyen ekran — web'deki
/// `MfaChallengeCard` ile aynı adım (AAL1 → AAL2).
class _MfaChallengeCard extends ConsumerStatefulWidget {
  const _MfaChallengeCard();

  @override
  ConsumerState<_MfaChallengeCard> createState() => _MfaChallengeCardState();
}

class _MfaChallengeCardState extends ConsumerState<_MfaChallengeCard> {
  final _codeController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _codeController.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final code = _codeController.text.trim();
    if (code.length < 6) return;
    FocusScope.of(context).unfocus();

    final ok = await ref.read(authProvider.notifier).submitMfaCode(code);
    if (!mounted || ok) return;

    final s = ref.read(appStringsProvider);
    final message = ref.read(authProvider).errorMessage ?? s.authMfaFail;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);
    final busy = auth.isSubmitting;
    final s = ref.watch(appStringsProvider);

    return AuthFormCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Icon(
            Icons.shield_outlined,
            color: Theme.of(context).colorScheme.primary,
            size: 32,
          ),
          const SizedBox(height: 12),
          Text(
            s.authMfaTitle,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            s.authMfaSubtitle,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: const Color(0xFFA1A1AA),
                ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),
          TextField(
            controller: _codeController,
            enabled: !busy,
            autofocus: true,
            keyboardType: TextInputType.number,
            textInputAction: TextInputAction.done,
            autofillHints: const [AutofillHints.oneTimeCode],
            style: const TextStyle(color: Colors.white, letterSpacing: 4),
            textAlign: TextAlign.center,
            maxLength: 8,
            onChanged: (value) {
              final digitsOnly = value.replaceAll(RegExp(r'\D'), '');
              if (digitsOnly != value) {
                _codeController.value = TextEditingValue(
                  text: digitsOnly,
                  selection: TextSelection.collapsed(offset: digitsOnly.length),
                );
              }
            },
            onSubmitted: (_) => _submit(),
            decoration: InputDecoration(
              labelText: s.authMfaCode,
              hintText: '123456',
              counterText: '',
            ),
          ),
          const SizedBox(height: 20),
          FilledButton(
            onPressed: (busy || _codeController.text.trim().length < 6)
                ? null
                : _submit,
            child: busy
                ? SizedBox(
                    height: 22,
                    width: 22,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Theme.of(context).colorScheme.onPrimary,
                    ),
                  )
                : Text(s.authMfaVerify),
          ),
          const SizedBox(height: 8),
          TextButton(
            onPressed: busy
                ? null
                : () => ref.read(authProvider.notifier).cancelMfaChallenge(),
            child: Text(s.authMfaCancel),
          ),
        ],
      ),
    );
  }
}
