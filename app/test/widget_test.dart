import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/material.dart';

import 'package:foodhub/core/widgets/error_widget.dart';

void main() {
  testWidgets('AppErrorState renders message and retry fires callback',
      (WidgetTester tester) async {
    var retryCount = 0;

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: AppErrorState(
            message: 'No internet connection. Check your network and try again.',
            onRetry: () => retryCount++,
          ),
        ),
      ),
    );

    expect(find.text('Something went wrong'), findsOneWidget);
    expect(
      find.text('No internet connection. Check your network and try again.'),
      findsOneWidget,
    );

    await tester.tap(find.text('Try Again'));
    expect(retryCount, 1);
  });
}
