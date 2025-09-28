# ユーザーマニュアル

SuperClaude Cursor統合システムの使用方法を説明します。

## 基本的な使用方法

### コマンド実行の基本

SuperClaudeコマンドをCursor IDEのチャット機能から実行できます：

```
/sc:research プロジェクト分析
/sc:analyze src/components/
/sc:review --pr
/sc:explain 関数の動作
```

### 利用可能なコマンド

#### コード分析系コマンド
- `/sc:analyze <path>` - コードの詳細分析
- `/sc:review <options>` - コードレビュー
- `/sc:explain <target>` - コードの説明

#### 調査・研究系コマンド
- `/sc:research <query>` - 技術調査
- `/sc:search <pattern>` - コード検索

#### 開発支援系コマンド
- `/sc:generate <type>` - コード生成
- `/sc:refactor <target>` - リファクタリング支援
- `/sc:optimize <target>` - パフォーマンス最適化

## 高度な使用方法

### プロジェクト設定の活用

`.claude.json`ファイルでプロジェクト固有の設定を管理：

```json
{
  "project_name": "my-project",
  "context": {
    "framework": "React",
    "language": "TypeScript"
  }
}
```

### 進行状況の監視

長時間実行されるコマンドは進行状況が表示されます：
- 準備中: コマンドの準備
- 実行中: SuperClaude CLIでの処理
- 処理中: 結果の整形

### キャッシュの活用

同じコマンドと引数の組み合わせは自動的にキャッシュされ、高速に結果が返されます。

## トラブルシューティング

問題が発生した場合は[トラブルシューティングガイド](troubleshooting.md)を参照してください。