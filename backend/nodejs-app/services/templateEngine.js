function render(template, data) {
    return template.replace(/{{\s*([\w.]+)\s*}}/g, (_, key) => {
        const parts = key.split('.');
        let value = data;
        for (const part of parts) {
            value = value ? value[part] : undefined;
            if (value === undefined) break;
        }
        return value !== undefined && value !== null ? String(value) : '';
    });
}

module.exports = { render };
