import * as fs from 'fs';
import * as path from 'path';
import * as handlebars from 'handlebars';

export class HandlebarsAdapter {
  constructor(private readonly options?: { ext?: string }) {}

  compile(mail: any, callback: (err: Error | null, result?: string) => void, templateOptions: any) {
    try {
      const templateName = templateOptions.template || mail.data.template;
      const dir = templateOptions.dir;
      const ext = this.options?.ext ?? '.hbs';
      const filePath = path.join(dir, `${templateName}${ext}`);
      const template = fs.readFileSync(filePath).toString();
      const compiled = handlebars.compile(template);
      const html = compiled(mail.data.context || {});
      return callback(null, html);
    } catch (err) {
      return callback(err as Error);
    }
  }
}
