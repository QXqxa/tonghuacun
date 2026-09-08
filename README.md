# 冒险岛怀旧服童话村

童话村相册、大事记和贡献榜。前端发布在 GitHub Pages，照片存放在 Supabase Storage。

## 本地运行

```bash
pnpm install
pnpm dev
```

## 相册配置

1. 在 Supabase 创建项目，并在 SQL Editor 执行 `supabase/setup.sql`。
2. 在 Authentication 创建唯一的管理员账号；网站只显示上传口令输入框，不公开管理员邮箱。
3. 把 Project URL、publishable key 和管理员账号别名填入 `public/config.js`。
4. 推送到 `main`，GitHub Actions 会自动发布网站。

`anon public key` 是前端公开配置；上传权限由 Supabase 登录和 RLS 策略控制。不要提交管理员密码或 service role key。
