export const layout = (content) => `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Kitab Open API</title>
</head>
<body>
  <h1>📖 Kitab Open API</h1>
  <nav>
    <a href="/">Beranda</a> |
    <a href="/kitab">Daftar Kitab</a>
  </nav>
  <hr/>
  <div>${content}</div>
</body>
</html>
`;
