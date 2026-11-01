import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../customer/screens/main_layout.dart';
import '../../../services/auth_service.dart';

class OtpScreen extends StatefulWidget {
  final String email;
  final String name;

  const OtpScreen({
    Key? key,
    required this.email,
    this.name = '',
  }) : super(key: key);

  @override
  State<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends State<OtpScreen> with WidgetsBindingObserver {
  static const Color _jdkartOrange = Color(0xFFF97316);
  static const Color _jdkartSlate = Color(0xFF1E293B);

  // 6 digit controllers and focus nodes
  final List<TextEditingController> _controllers =
      List.generate(6, (_) => TextEditingController());
  final List<FocusNode> _focusNodes = List.generate(6, (_) => FocusNode());

  bool _isLoading = false;
  bool _isResending = false;

  // Countdown timer for resend (60 seconds)
  int _secondsRemaining = 60;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _startCountdown();

    // Auto-focus first box
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && _focusNodes.isNotEmpty) {
        _focusNodes[0].requestFocus();
      }
      _checkAndAutoFillFromClipboard();
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      // When user switches back from email app, auto-check clipboard
      _checkAndAutoFillFromClipboard();
    }
  }

  /// Automatically reads 6-digit OTP if copied to clipboard
  Future<void> _checkAndAutoFillFromClipboard() async {
    try {
      final data = await Clipboard.getData(Clipboard.kTextPlain);
      if (data?.text != null) {
        final text = data!.text!.trim();
        final match = RegExp(r'\b\d{6}\b').firstMatch(text);
        if (match != null) {
          final otp = match.group(0)!;
          if (_otpCode != otp && mounted) {
            _distributeOtp(otp);
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('OTP automatically filled from clipboard!'),
                backgroundColor: Color(0xFF16A34A),
                duration: Duration(seconds: 2),
              ),
            );
          }
        }
      }
    } catch (_) {}
  }

  void _distributeOtp(String text) {
    final clean = text.replaceAll(RegExp(r'\D'), '');
    if (clean.isEmpty) return;

    for (int i = 0; i < 6; i++) {
      if (i < clean.length) {
        _controllers[i].text = clean[i];
      } else {
        _controllers[i].clear();
      }
    }

    if (clean.length >= 6) {
      _focusNodes[5].unfocus();
      _handleVerifyOtp();
    } else {
      _focusNodes[clean.length].requestFocus();
    }
  }

  void _startCountdown() {
    _timer?.cancel();
    setState(() => _secondsRemaining = 60);
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_secondsRemaining > 0) {
        setState(() => _secondsRemaining--);
      } else {
        timer.cancel();
      }
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _timer?.cancel();
    for (final c in _controllers) {
      c.dispose();
    }
    for (final f in _focusNodes) {
      f.dispose();
    }
    super.dispose();
  }

  String get _otpCode => _controllers.map((c) => c.text.trim()).join();

  Future<void> _handleVerifyOtp() async {
    if (_isLoading) return;

    final otp = _otpCode;
    if (otp.length < 6) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter the full 6-digit verification code.'),
          backgroundColor: Colors.redAccent,
        ),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final result = await AuthService.instance.verifyEmailOtp(
        email: widget.email,
        otp: otp,
        name: widget.name,
      );

      if (!mounted) return;

      if (result['success'] == true) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Welcome to JDkart! Verification successful.'),
            backgroundColor: Color(0xFF16A34A),
          ),
        );

        Navigator.pushAndRemoveUntil(
          context,
          MaterialPageRoute(builder: (_) => const MainLayout()),
          (route) => false,
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(result['message'] ?? 'Invalid verification code.'),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Verification error: $e'),
          backgroundColor: Colors.redAccent,
        ),
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _handleResendOtp() async {
    if (_secondsRemaining > 0 || _isResending) return;

    setState(() => _isResending = true);

    try {
      final result = await AuthService.instance.sendEmailOtp(widget.email);

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(result['message'] ?? 'Code resent to ${widget.email}'),
          backgroundColor: result['success'] == true ? const Color(0xFF16A34A) : Colors.redAccent,
        ),
      );
      if (result['success'] == true) {
        _startCountdown();
      }
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Code resent to ${widget.email}'),
          backgroundColor: const Color(0xFF16A34A),
        ),
      );
      _startCountdown();
    } finally {
      if (mounted) setState(() => _isResending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: _jdkartSlate),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // Header brand mark
              RichText(
                text: const TextSpan(
                  children: [
                    TextSpan(
                      text: 'JD',
                      style: TextStyle(
                        color: _jdkartSlate,
                        fontSize: 32,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.5,
                      ),
                    ),
                    TextSpan(
                      text: 'kart',
                      style: TextStyle(
                        color: _jdkartOrange,
                        fontSize: 32,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // Mail Icon Avatar
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  color: const Color(0xFFFFF7ED),
                  shape: BoxShape.circle,
                  border: Border.all(color: const Color(0xFFFFEDD5), width: 2),
                ),
                child: const Icon(
                  Icons.mark_email_read_outlined,
                  size: 34,
                  color: _jdkartOrange,
                ),
              ),

              const SizedBox(height: 20),

              const Text(
                'Enter Verification Code',
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: _jdkartSlate,
                ),
              ),

              const SizedBox(height: 8),

              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: RichText(
                  textAlign: TextAlign.center,
                  text: TextSpan(
                    style: const TextStyle(
                      fontSize: 14,
                      color: Color(0xFF64748B),
                      height: 1.4,
                    ),
                    children: [
                      const TextSpan(text: 'We have sent a 6-digit code to\n'),
                      TextSpan(
                        text: widget.email,
                        style: const TextStyle(
                          color: _jdkartSlate,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 10),

              TextButton(
                onPressed: () => Navigator.pop(context),
                style: TextButton.styleFrom(
                  visualDensity: VisualDensity.compact,
                ),
                child: const Text(
                  'Edit Email',
                  style: TextStyle(
                    color: _jdkartOrange,
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                    decoration: TextDecoration.underline,
                  ),
                ),
              ),

              const SizedBox(height: 28),

              // AutofillGroup for automatic OS/keyboard OTP filling
              AutofillGroup(
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(6, (index) => _buildOtpBox(index)),
                ),
              ),

              const SizedBox(height: 28),

              // Resend countdown
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.timer_outlined, size: 16, color: Color(0xFF94A3B8)),
                  const SizedBox(width: 6),
                  if (_secondsRemaining > 0)
                    Text(
                      'Resend code in 00:${_secondsRemaining.toString().padLeft(2, '0')}',
                      style: const TextStyle(
                        color: Color(0xFF64748B),
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                    )
                  else
                    GestureDetector(
                      onTap: _isResending ? null : _handleResendOtp,
                      child: Text(
                        _isResending ? 'Resending...' : 'Resend OTP',
                        style: const TextStyle(
                          color: _jdkartOrange,
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          decoration: TextDecoration.underline,
                        ),
                      ),
                    ),
                ],
              ),

              const SizedBox(height: 32),

              // Verify button
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _handleVerifyOtp,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _jdkartOrange,
                    foregroundColor: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    disabledBackgroundColor: _jdkartOrange.withOpacity(0.6),
                  ),
                  child: _isLoading
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(
                            strokeWidth: 2.5,
                            valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                          ),
                        )
                      : const Text(
                          'Verify & Login',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.3,
                          ),
                        ),
                ),
              ),

              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildOtpBox(int index) {
    return Container(
      width: 44,
      height: 52,
      margin: const EdgeInsets.symmetric(horizontal: 4),
      child: TextField(
        controller: _controllers[index],
        focusNode: _focusNodes[index],
        keyboardType: TextInputType.number,
        textAlign: TextAlign.center,
        autofillHints: const [AutofillHints.oneTimeCode],
        style: const TextStyle(
          fontSize: 20,
          fontWeight: FontWeight.w800,
          color: _jdkartSlate,
        ),
        decoration: InputDecoration(
          counterText: '',
          filled: true,
          fillColor: const Color(0xFFF8FAFC),
          contentPadding: const EdgeInsets.symmetric(vertical: 12),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: const BorderSide(color: Color(0xFFCBD5E1), width: 1.2),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: const BorderSide(color: Color(0xFFCBD5E1), width: 1.2),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: const BorderSide(color: _jdkartOrange, width: 2),
          ),
        ),
        onChanged: (value) {
          if (value.length > 1) {
            // User pasted or keyboard autofilled a multi-digit code
            _distributeOtp(value);
            return;
          }

          if (value.isNotEmpty) {
            // Single digit typed -> advance to next box
            if (index < 5) {
              _focusNodes[index + 1].requestFocus();
            } else {
              _focusNodes[index].unfocus();
              _handleVerifyOtp();
            }
          } else {
            // Backspace -> move back to previous box
            if (index > 0) {
              _focusNodes[index - 1].requestFocus();
            }
          }
        },
      ),
    );
  }
}
