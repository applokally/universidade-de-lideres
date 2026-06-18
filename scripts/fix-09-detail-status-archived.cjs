const fs = require("fs");
const path = require("path");

const filePath = path.join(
  process.cwd(),
  "src",
  "app",
  "admin",
  "comunidade",
  "publicacoes",
  "[id]",
  "page.tsx"
);

if (fs.existsSync(filePath)) {
  let content = fs.readFileSync(filePath, "utf8");

  if (!content.includes('<option value="archived">Arquivado</option>')) {
    content = content.replace(
      '<option value="hidden">Oculto</option>\n                    <option value="deleted">Excluído</option>',
      '<option value="hidden">Oculto</option>\n                    <option value="archived">Arquivado</option>\n                    <option value="deleted">Excluído</option>',
    );
  }

  fs.writeFileSync(filePath, content, "utf8");
  console.log("Detalhe da publicação atualizado com status Arquivado.");
}
