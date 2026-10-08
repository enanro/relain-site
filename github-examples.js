const GitHubClient = require('./github-client');

async function main() {
  const client = new GitHubClient();
  const [command, owner, repo] = process.argv.slice(2);

  if (!command || command === 'check' || command === 'repos') {
    // Успешный запрос списка репозиториев подтверждает, что токен работает.
    const repos = await client.getMyRepos();
    console.log('Проверка токена прошла успешно.');

    if (!command) {
      // По умолчанию читаем README первого доступного репозитория, если он есть.
      const firstRepo = repos.find((item) => item.owner && item.name);
      if (firstRepo) {
        try {
          await client.getFileContent(firstRepo.owner.login, firstRepo.name, 'README.md');
        } catch (error) {
          if (!error.message.includes('HTTP 404')) throw error;
          console.log('README.md первого репозитория не найден. Для другого файла используйте метод getFileContent.');
        }
      } else {
        console.log('Репозиториев нет. Укажите существующий репозиторий для примера чтения файла.');
      }
    }
    return;
  }

  if (command === 'readme') {
    if (!owner || !repo) throw new Error('Пример: node github-examples.js readme ВЛАДЕЛЕЦ РЕПОЗИТОРИЙ');
    await client.getFileContent(owner, repo, 'README.md');
    return;
  }

  if (command === 'issue') {
    if (!owner || !repo) throw new Error('Пример: node github-examples.js issue ВЛАДЕЛЕЦ РЕПОЗИТОРИЙ');
    // Эта команда действительно создаёт тестовую issue в указанном репозитории.
    await client.createIssue(owner, repo, 'Тестовая issue из GitHubClient', 'Проверка создания issue через GitHub API.');
    return;
  }

  throw new Error('Неизвестная команда. Используйте check, repos, readme или issue.');
}

main().catch((error) => {
  console.error(`Пример завершился с ошибкой: ${error.message}`);
  process.exitCode = 1;
});
