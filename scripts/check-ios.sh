#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
task_sdk="$(xcrun --sdk iphonesimulator --show-sdk-path)"
xcrun swiftc -sdk "$task_sdk" -target arm64-apple-ios17.0-simulator -typecheck ios/Shared/FocusActivity.swift ios/WorldFocus/WorldFocusApp.swift
xcrun swiftc -sdk "$task_sdk" -target arm64-apple-ios17.0-simulator -application-extension -typecheck ios/Shared/FocusActivity.swift ios/FocusWidgets/FocusWidgets.swift
printf 'Swift app and widget type checks passed.\n'
