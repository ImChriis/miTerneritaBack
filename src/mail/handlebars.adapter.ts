import * as fs from 'fs';
import * as path from 'path';
import * as handlebars from 'handlebars';

export class HandlebarsAdapter {
  constructor(
    private readonly dir: string,
    private readonly options?: { ext?: string },
  ) {}

  compile(
    mail: any,
    callback: (err: Error | null) => void,
    templateOptions: any,
  ) {
    try {
      const templateName = mail.data.template;
      const ext = this.options?.ext ?? '.hbs';
      const filePath = path.join(this.dir, `${templateName}${ext}`);
      const template = fs.readFileSync(filePath).toString();
      const compiled = handlebars.compile(template);
      const html = compiled(mail.data.context || {});

      mail.data.html = html;
      return callback(null);
    } catch (err) {
      return callback(err as Error);
    }
  }
}