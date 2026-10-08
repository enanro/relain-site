const fs = require('node:fs');
const path = require('node:path');

class GitHubClient {
  constructor() {
    try {
      if (typeof fetch !== 'function') {
        throw new Error('Нужен Node.js версии 18 или новее (со встроенным fetch).');
      }

      const envPath = path.join(__dirname, '.env');
      const envText = fs.readFileSync(envPath, 'utf8').replace(/^\uFEFF/, '');
      const tokenLine = envText.split(/\r?\n/).find((line) => /^\s*GITHUB_TOKEN\s*=/.test(line));
      if (!tokenLine) {
        throw new Error('В файле .env отсутствует GITHUB_TOKEN.');
      }

      let token = tokenLine.slice(tokenLine.indexOf('=') + 1).trim();
      if ((token.startsWith('"') && token.endsWith('"')) ||
          (token.startsWith("'") && token.endsWith("'"))) {
        token = token.slice(1, -1);
      }
      if (!token || /\s/.test(token) || token.startsWith('[') || token.endsWith(']')) {
        throw new Error('GITHUB_TOKEN пуст или содержит недопустимые символы. Запишите токен без скобок.');
      }
      this.token = token;
      console.log('Токен загружен из .env. Доступ будет проверен при первом запросе к GitHub.');
    } catch (error) {
      const message = error.code === 'ENOENT'
        ? 'Файл .env не найден рядом с github-client.js.'
        : error.message;
      console.error(`Ошибка инициализации GitHubClient: ${message}`);
      throw new Error(message);
    }
  }

  async request(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${this.token}`,
          'X-GitHub-Api-Version': '2022-11-28',
          ...options.headers,
        },
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const details = data && typeof data.message === 'string' ? `: ${data.message}` : '';
        throw new Error(`GitHub API вернул HTTP ${response.status}${details}`);
      }
      if (data === null) {
        throw new Error('GitHub API вернул ответ без корректного JSON.');
      }
      return data;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Превышено время ожидания ответа GitHub API (15 секунд).');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  async getMyRepos() {
    try {
      const repos = [];
      for (let page = 1; ; page += 1) {
        const url = `https://api.github.com/user/repos?per_page=100&page=${page}&affiliation=owner,collaborator,organization_member`;
        const batch = await this.request(url);
        if (!Array.isArray(batch)) {
          throw new Error('Неожиданный формат списка репозиториев.');
        }
        repos.push(...batch);
        if (batch.length < 100) break;
      }
      console.log(`Найдено доступных репозиториев: ${repos.length}`);
      repos.forEach((repo) => console.log(`- ${repo.full_name} (${repo.html_url})`));
      return repos;
    } catch (error) {
      console.error(`Ошибка получения репозиториев: ${error.message}`);
      throw error;
    }
  }

  async getFileContent(owner, repo, filePath) {
    try {
      this.validateRepo(owner, repo);
      if (typeof filePath !== 'string' || !filePath.trim() ||
          filePath.split('/').some((segment) => !segment || segment === '.' || segment === '..')) {
        throw new Error('Укажите корректный путь к файлу в репозитории.');
      }
      const encodedPath = filePath.split('/').map(encodeURIComponent).join('/');
      const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}`;
      const data = await this.request(url);
      if (data.type !== 'file' || data.encoding !== 'base64' || typeof data.content !== 'string') {
        throw new Error('Путь не указывает на обычный файл с содержимым в ответе GitHub API.');
      }
      const content = Buffer.from(data.content.replace(/\s/g, ''), 'base64').toString('utf8');
      console.log(`Содержимое ${owner}/${repo}/${filePath}:\n${content}`);
      return content;
    } catch (error) {
      console.error(`Ошибка чтения файла: ${error.message}`);
      throw error;
    }
  }

  async createIssue(owner, repo, title, body) {
    try {
      this.validateRepo(owner, repo);
      if (typeof title !== 'string' || !title.trim()) {
        throw new Error('Заголовок issue не может быть пустым.');
      }
      if (typeof body !== 'string') {
        throw new Error('Текст issue должен быть строкой.');
      }
      const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues`;
      const issue = await this.request(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), body }),
      });
      console.log(`Issue создана: #${issue.number} ${issue.html_url}`);
      return issue;
    } catch (error) {
      console.error(`Ошибка создания issue: ${error.message}`);
      throw error;
    }
  }

  validateRepo(owner, repo) {
    for (const [name, value] of [['owner', owner], ['repo', repo]]) {
      if (typeof value !== 'string' || !/^[A-Za-z0-9_.-]+$/.test(value)) {
        throw new Error(`Укажите корректное значение ${name}.`);
      }
    }
  }
}

module.exports = GitHubClient;
