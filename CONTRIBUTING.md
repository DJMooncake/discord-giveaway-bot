# Contributing

Thanks for your interest in improving this bot.

## How to contribute

1. Fork the repository.
2. Create a feature branch.
3. Make your changes.
4. Test locally with `npm run build`.
5. Open a pull request with a clear explanation.

## Local setup

```bash
npm install
cp .env.example .env
```

Add your own Discord credentials to the local `.env` file. Do not commit secrets.

## Coding guidelines

- Prefer clear, readable TypeScript.
- Keep support for both slash and prefix commands where relevant.
- Avoid committing tokens, secrets, or real bot credentials.
- Run the TypeScript build before opening a pull request.
