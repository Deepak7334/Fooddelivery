import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../customer/screens/main_layout.dart';

// ─────────────────────────────────────────────────────────────────────────────
//  COLOUR PALETTE
// ─────────────────────────────────────────────────────────────────────────────
const Color _orange = Color(0xFFF97316);
const Color _orangeDark = Color(0xFFEA580C);
const Color _orangeLight = Color(0xFFFFEDD5);
const Color _slate = Color(0xFF0F172A);
const Color _subtext = Color(0xFF64748B);

// ─────────────────────────────────────────────────────────────────────────────
//  SPLASH SCREEN — Single Unified Screen (Logo + Dynamic Animated "JDKart")
// ─────────────────────────────────────────────────────────────────────────────
class SplashScreen extends StatefulWidget {
  const SplashScreen({Key? key}) : super(key: key);

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with TickerProviderStateMixin {
  // Logo entrance & pulse
  late final AnimationController _logoCtrl;
  late final Animation<double> _logoScale;
  late final Animation<double> _logoFade;

  // Expanding ambient ripple rings behind the logo
  late final AnimationController _rippleCtrl;

  // Dynamic brand title "JDKart" animation
  late final AnimationController _titleCtrl;
  late final Animation<double> _titleScale;
  late final Animation<Offset> _titleSlide;
  late final Animation<double> _titleFade;

  // Sparkle / gleaming star accent
  late final AnimationController _sparkleCtrl;
  late final Animation<double> _sparkleScale;
  late final Animation<double> _sparkleRotate;

  // Tagline animation
  late final AnimationController _taglineCtrl;
  late final Animation<double> _taglineFade;
  late final Animation<double> _taglineSlide;

  // Bottom progress loader
  late final AnimationController _loaderCtrl;
  late final Animation<double> _loaderProgress;

  bool _navigated = false;

  @override
  void initState() {
    super.initState();

    // 1. Logo Animation (0 to 900ms) ──────────────────────────────────────────
    _logoCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    );
    _logoScale = TweenSequence<double>([
      TweenSequenceItem(
        tween: Tween<double>(begin: 0.88, end: 1.05)
            .chain(CurveTween(curve: Curves.easeOutCubic)),
        weight: 65,
      ),
      TweenSequenceItem(
        tween: Tween<double>(begin: 1.05, end: 1.0)
            .chain(CurveTween(curve: Curves.easeInOut)),
        weight: 35,
      ),
    ]).animate(_logoCtrl);

    _logoFade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _logoCtrl,
        curve: const Interval(0.0, 0.45, curve: Curves.easeIn),
      ),
    );

    // 2. Continuous ambient ripple behind logo ────────────────────────────────
    _rippleCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    )..repeat();

    // 3. Dynamic "JDKart" Title Reveal (0.8s with spring/bounce) ─────────────
    _titleCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    _titleScale = Tween<double>(begin: 0.75, end: 1.0).animate(
      CurvedAnimation(parent: _titleCtrl, curve: Curves.elasticOut),
    );
    _titleSlide =
        Tween<Offset>(begin: const Offset(0, 0.4), end: Offset.zero).animate(
      CurvedAnimation(parent: _titleCtrl, curve: Curves.easeOutBack),
    );
    _titleFade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _titleCtrl,
        curve: const Interval(0.0, 0.5, curve: Curves.easeIn),
      ),
    );

    // 4. Sparkle Flare Accent ────────────────────────────────────────────────
    _sparkleCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat(reverse: true);
    _sparkleScale = Tween<double>(begin: 0.85, end: 1.25).animate(
      CurvedAnimation(parent: _sparkleCtrl, curve: Curves.easeInOut),
    );
    _sparkleRotate = Tween<double>(begin: 0.0, end: math.pi / 4).animate(
      CurvedAnimation(parent: _sparkleCtrl, curve: Curves.easeInOut),
    );

    // 5. Tagline Reveal ──────────────────────────────────────────────────────
    _taglineCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 650),
    );
    _taglineFade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _taglineCtrl, curve: Curves.easeIn),
    );
    _taglineSlide = Tween<double>(begin: 10.0, end: 0.0).animate(
      CurvedAnimation(parent: _taglineCtrl, curve: Curves.easeOutCubic),
    );

    // 6. Loader Progress Bar (fills up to 100% in 2.2s) ──────────────────────
    _loaderCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2200),
    );
    _loaderProgress = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _loaderCtrl, curve: Curves.easeInOutCubic),
    );

    _playAnimationSequence();
  }

  Future<void> _playAnimationSequence() async {
    // Start logo immediately
    _logoCtrl.forward();

    // Start title bounce shortly after logo settles
    await Future.delayed(const Duration(milliseconds: 320));
    if (!mounted) return;
    _titleCtrl.forward();

    // Start tagline and progress loader
    await Future.delayed(const Duration(milliseconds: 250));
    if (!mounted) return;
    _taglineCtrl.forward();
    _loaderCtrl.forward();

    // Wait for the full splash showcase before auto-navigating
    await Future.delayed(const Duration(milliseconds: 1900));
    if (!mounted) return;
    _navigateHome();
  }

  void _navigateHome() {
    if (_navigated) return;
    _navigated = true;

    Navigator.pushReplacement(
      context,
      PageRouteBuilder(
        pageBuilder: (_, __, ___) => const MainLayout(),
        transitionsBuilder: (_, anim, __, child) =>
            FadeTransition(opacity: anim, child: child),
        transitionDuration: const Duration(milliseconds: 450),
      ),
    );
  }

  @override
  void dispose() {
    _logoCtrl.dispose();
    _rippleCtrl.dispose();
    _titleCtrl.dispose();
    _sparkleCtrl.dispose();
    _taglineCtrl.dispose();
    _loaderCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;

    return Scaffold(
      backgroundColor: Colors.white,
      body: Stack(
        children: [
          // ── Ambient Soft Background Gradient ───────────────────────────────
          Positioned.fill(
            child: Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.white,
                    Color(0xFFFFFBF7),
                    Color(0xFFFFF7ED),
                  ],
                  stops: [0.0, 0.65, 1.0],
                ),
              ),
            ),
          ),

          // ── Skip Button (Top Right) ────────────────────────────────────────
          SafeArea(
            child: Align(
              alignment: Alignment.topRight,
              child: Padding(
                padding: const EdgeInsets.only(top: 8, right: 16),
                child: TextButton(
                  onPressed: _navigateHome,
                  style: TextButton.styleFrom(
                    foregroundColor: _subtext,
                    padding:
                        const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: const [
                      Text(
                        'Skip',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: _orange,
                        ),
                      ),
                      SizedBox(width: 2),
                      Icon(Icons.chevron_right, size: 18, color: _orange),
                    ],
                  ),
                ),
              ),
            ),
          ),

          // ── Centered Content: Logo + Dynamic JDKart Branding ───────────────
          Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // 1. Logo with Animated Ambient Ripple Rings
                Stack(
                  alignment: Alignment.center,
                  children: [
                    // Dynamic pulsating ambient halo ring
                    AnimatedBuilder(
                      animation: _rippleCtrl,
                      builder: (context, _) {
                        final val = _rippleCtrl.value;
                        return Container(
                          width: 155 + (val * 35),
                          height: 155 + (val * 35),
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: _orange.withValues(alpha: (1.0 - val) * 0.25),
                              width: 1.5,
                            ),
                          ),
                        );
                      },
                    ),

                    // Soft ambient warm background glow
                    Container(
                      width: 145,
                      height: 145,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: _orange.withValues(alpha: 0.18),
                            blurRadius: 36,
                            spreadRadius: 8,
                          ),
                        ],
                      ),
                    ),

                    // Primary Official Logo
                    FadeTransition(
                      opacity: _logoFade,
                      child: ScaleTransition(
                        scale: _logoScale,
                        child: Container(
                          width: 140,
                          height: 140,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: Colors.white,
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.08),
                                blurRadius: 20,
                                offset: const Offset(0, 8),
                              ),
                            ],
                          ),
                          padding: const EdgeInsets.all(12),
                          child: ClipOval(
                            child: Image.asset(
                              'assets/images/logo.png',
                              fit: BoxFit.contain,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 28),

                // 2. Dynamic Animated Brand Name "JDKart"
                FadeTransition(
                  opacity: _titleFade,
                  child: SlideTransition(
                    position: _titleSlide,
                    child: ScaleTransition(
                      scale: _titleScale,
                      child: Stack(
                        clipBehavior: Clip.none,
                        alignment: Alignment.center,
                        children: [
                          // Brand Typography
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            crossAxisAlignment: CrossAxisAlignment.baseline,
                            textBaseline: TextBaseline.alphabetic,
                            children: [
                              // "JD" in Deep Slate / Charcoal
                              Text(
                                'JD',
                                style: TextStyle(
                                  color: _slate,
                                  fontSize: 46,
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: 0.5,
                                  fontFamily: 'Roboto',
                                  shadows: [
                                    Shadow(
                                      color: Colors.black.withValues(alpha: 0.12),
                                      offset: const Offset(0, 3),
                                      blurRadius: 6,
                                    ),
                                  ],
                                ),
                              ),

                              // "kart" in Vibrant Gradient Orange
                              ShaderMask(
                                shaderCallback: (bounds) {
                                  return const LinearGradient(
                                    colors: [_orange, _orangeDark],
                                    begin: Alignment.topCenter,
                                    end: Alignment.bottomCenter,
                                  ).createShader(bounds);
                                },
                                blendMode: BlendMode.srcIn,
                                child: Text(
                                  'kart',
                                  style: TextStyle(
                                    fontSize: 46,
                                    fontWeight: FontWeight.w900,
                                    letterSpacing: 0.5,
                                    fontFamily: 'Roboto',
                                    shadows: [
                                      Shadow(
                                        color: _orange.withValues(alpha: 0.4),
                                        offset: const Offset(0, 4),
                                        blurRadius: 10,
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),

                          // Dynamic Sparkle Flare on top-right of "kart"
                          Positioned(
                            top: -6,
                            right: -24,
                            child: AnimatedBuilder(
                              animation: _sparkleCtrl,
                              builder: (context, _) {
                                return Transform.rotate(
                                  angle: _sparkleRotate.value,
                                  child: Transform.scale(
                                    scale: _sparkleScale.value,
                                    child: const Icon(
                                      Icons.auto_awesome,
                                      color: _orange,
                                      size: 22,
                                    ),
                                  ),
                                );
                              },
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),

                const SizedBox(height: 10),

                // 3. Tagline with Subtle Reveal
                AnimatedBuilder(
                  animation: _taglineCtrl,
                  builder: (context, child) {
                    return Opacity(
                      opacity: _taglineFade.value,
                      child: Transform.translate(
                        offset: Offset(0, _taglineSlide.value),
                        child: child,
                      ),
                    );
                  },
                  child: Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                    decoration: BoxDecoration(
                      color: _orangeLight.withValues(alpha: 0.6),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Text(
                      'FAST FOOD • QUICK GROCERIES',
                      style: TextStyle(
                        color: _orangeDark,
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 1.4,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // ── Bottom Section: Animated Loader & Slogan ───────────────────────
          Positioned(
            left: 36,
            right: 36,
            bottom: size.height * 0.07,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Glowing Animated Progress Bar
                AnimatedBuilder(
                  animation: _loaderProgress,
                  builder: (context, _) {
                    return Container(
                      height: 4,
                      width: 140,
                      decoration: BoxDecoration(
                        color: const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Align(
                        alignment: Alignment.centerLeft,
                        child: Container(
                          width: 140 * _loaderProgress.value,
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [_orange, _orangeDark],
                            ),
                            borderRadius: BorderRadius.circular(4),
                            boxShadow: [
                              BoxShadow(
                                color: _orange.withValues(alpha: 0.5),
                                blurRadius: 6,
                                offset: const Offset(0, 1),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),

                const SizedBox(height: 14),

                // Friendly subtitle
                const Text(
                  'Delivering happiness to your doorstep...',
                  style: TextStyle(
                    color: _subtext,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    letterSpacing: 0.3,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
