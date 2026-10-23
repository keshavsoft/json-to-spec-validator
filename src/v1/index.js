import tags from "../../docs/tags/tags.json" with { type: "json" };

const isPlainObject = (value) =>
    value !== null && typeof value === "object" && !Array.isArray(value);

const childPath = (base, key) => base ? `${base}.${key}` : String(key);

const validateNode = (spec, path, errors) => {
    if (typeof spec === "string" || typeof spec === "number") return;
    if (!isPlainObject(spec)) {
        errors.push({ path, message: "Expected an element specification, string, or number." });
        return;
    }
    if (typeof spec.tagName !== "string" || !spec.tagName.trim()) {
        errors.push({ path: childPath(path, "tagName"), message: "tagName must be a non-empty string." });
        return;
    }

    const tagName = spec.tagName.toLowerCase();
    const definition = Object.hasOwn(tags, tagName) ? tags[tagName] : undefined;
    if (!definition || typeof definition !== "object") {
        errors.push({ path: childPath(path, "tagName"), message: `Unsupported tag: ${spec.tagName}.` });
        return;
    }

    if (spec.textContent !== undefined && !definition.allowsTextContent) {
        errors.push({ path: childPath(path, "textContent"), message: `<${tagName}> does not allow textContent.` });
    }

    for (const section of ["attributes", "properties"]) {
        if (spec[section] !== undefined && !isPlainObject(spec[section])) {
            errors.push({ path: childPath(path, section), message: `${section} must be an object.` });
        }
    }

    if (isPlainObject(spec.attributes)) {
        for (const attrName of Object.keys(spec.attributes)) {
            if (!(definition.allowedAttributes || []).includes(attrName)) {
                errors.push({
                    path: childPath(childPath(path, "attributes"), attrName),
                    message: `Attribute "${attrName}" is not listed as allowed for <${tagName}>.`
                });
            }
        }
    }

    if (spec.children !== undefined && !Array.isArray(spec.children)) {
        errors.push({ path: childPath(path, "children"), message: "children must be an array." });
        return;
    }

    const children = spec.children || [];
    if (children.length && !definition.allowsChildren) {
        errors.push({ path: childPath(path, "children"), message: `<${tagName}> does not allow children.` });
    }

    const allowedChildTags = definition.childTags;
    if (Array.isArray(allowedChildTags) && allowedChildTags.length) {
        children.forEach((child, index) => {
            if (isPlainObject(child) && typeof child.tagName === "string" &&
                !allowedChildTags.includes(child.tagName.toLowerCase())) {
                errors.push({
                    path: childPath(childPath(path, "children"), index),
                    message: `<${child.tagName}> is not listed as an allowed child of <${tagName}>.`
                });
            }
        });
    }
    children.forEach((child, index) => validateNode(child, childPath(childPath(path, "children"), index), errors));
};

const validateSpec = (specOrConfig) => {
    const spec = (specOrConfig && typeof specOrConfig === "object" && "spec" in specOrConfig)
        ? specOrConfig.spec
        : specOrConfig;
    const errors = [];

    validateNode(spec, "spec", errors);

    return { isValid: errors.length === 0, errors };
};

export { validateSpec };
export default validateSpec;