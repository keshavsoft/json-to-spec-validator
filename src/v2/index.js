import tags from "../../docs/tags/tags.json" with { type: "json" };

const isPlainObject = ({ inValue }) => {
    const localValue = inValue;
    return localValue !== null && typeof localValue === "object" && !Array.isArray(localValue);
};

const childPath = ({ inBase, inKey }) => {
    const localBase = inBase;
    const localKey = inKey;
    return localBase ? `${localBase}.${localKey}` : String(localKey);
};

const getTagDefinition = ({ inTagName }) => {
    const localTagName = inTagName;
    const normalizedTag = localTagName.toLowerCase();
    const definition = Object.hasOwn(tags, normalizedTag) ? tags[normalizedTag] : undefined;
    return {
        normalizedTag,
        definition: (definition && typeof definition === "object") ? definition : undefined
    };
};

const validateTagStructure = ({ inSpec, inPath, inErrors }) => {
    const localSpec = inSpec;
    const localPath = inPath;
    const localErrors = inErrors;

    if (!isPlainObject({ inValue: localSpec })) {
        localErrors.push({ path: localPath, message: "Expected an element specification, string, or number." });
        return { isValid: false };
    }

    if (typeof localSpec.tagName !== "string" || !localSpec.tagName.trim()) {
        localErrors.push({ path: childPath({ inBase: localPath, inKey: "tagName" }), message: "tagName must be a non-empty string." });
        return { isValid: false };
    }

    const { normalizedTag, definition } = getTagDefinition({ inTagName: localSpec.tagName });
    if (!definition) {
        localErrors.push({ path: childPath({ inBase: localPath, inKey: "tagName" }), message: `Unsupported tag: ${localSpec.tagName}.` });
        return { isValid: false };
    }

    return { isValid: true, normalizedTag, definition };
};

const validateTextContent = ({ inSpec, inPath, inDefinition, inNormalizedTag, inErrors }) => {
    const localSpec = inSpec;
    const localPath = inPath;
    const localDefinition = inDefinition;
    const localNormalizedTag = inNormalizedTag;
    const localErrors = inErrors;

    if (localSpec.textContent !== undefined && !localDefinition.allowsTextContent) {
        localErrors.push({
            path: childPath({ inBase: localPath, inKey: "textContent" }),
            message: `<${localNormalizedTag}> does not allow textContent.`
        });
    }
};

const validateSections = ({ inSpec, inPath, inErrors }) => {
    const localSpec = inSpec;
    const localPath = inPath;
    const localErrors = inErrors;

    for (const section of ["attributes", "properties"]) {
        if (localSpec[section] !== undefined && !isPlainObject({ inValue: localSpec[section] })) {
            localErrors.push({
                path: childPath({ inBase: localPath, inKey: section }),
                message: `${section} must be an object.`
            });
        }
    }
};

const validateAttributes = ({ inAttributes, inPath, inDefinition, inNormalizedTag, inErrors }) => {
    const localAttributes = inAttributes;
    const localPath = inPath;
    const localDefinition = inDefinition;
    const localNormalizedTag = inNormalizedTag;
    const localErrors = inErrors;

    if (!isPlainObject({ inValue: localAttributes })) return;

    const allowed = localDefinition.allowedAttributes || [];
    for (const attrName of Object.keys(localAttributes)) {
        if (!allowed.includes(attrName)) {
            localErrors.push({
                path: childPath({
                    inBase: childPath({ inBase: localPath, inKey: "attributes" }),
                    inKey: attrName
                }),
                message: `Attribute "${attrName}" is not listed as allowed for <${localNormalizedTag}>.`
            });
        }
    }
};

const validateChildren = ({ inChildren, inPath, inDefinition, inNormalizedTag, inErrors }) => {
    const localChildren = inChildren;
    const localPath = inPath;
    const localDefinition = inDefinition;
    const localNormalizedTag = inNormalizedTag;
    const localErrors = inErrors;

    if (localChildren === undefined) return { isValid: true, childrenList: [] };

    if (!Array.isArray(localChildren)) {
        localErrors.push({ path: childPath({ inBase: localPath, inKey: "children" }), message: "children must be an array." });
        return { isValid: false, childrenList: [] };
    }

    if (localChildren.length && !localDefinition.allowsChildren) {
        localErrors.push({
            path: childPath({ inBase: localPath, inKey: "children" }),
            message: `<${localNormalizedTag}> does not allow children.`
        });
    }

    const allowedChildTags = localDefinition.childTags;
    if (Array.isArray(allowedChildTags) && allowedChildTags.length) {
        localChildren.forEach((child, index) => {
            if (isPlainObject({ inValue: child }) && typeof child.tagName === "string" &&
                !allowedChildTags.includes(child.tagName.toLowerCase())) {
                localErrors.push({
                    path: childPath({ inBase: childPath({ inBase: localPath, inKey: "children" }), inKey: index }),
                    message: `<${child.tagName}> is not listed as an allowed child of <${localNormalizedTag}>.`
                });
            }
        });
    }

    return { isValid: true, childrenList: localChildren };
};

const validateNode = ({ inSpec, inPath, inErrors }) => {
    const localSpec = inSpec;
    const localPath = inPath;
    const localErrors = inErrors;

    if (typeof localSpec === "string" || typeof localSpec === "number") return;

    const { isValid, normalizedTag, definition } = validateTagStructure({
        inSpec: localSpec,
        inPath: localPath,
        inErrors: localErrors
    });
    if (!isValid) return;

    validateTextContent({
        inSpec: localSpec,
        inPath: localPath,
        inDefinition: definition,
        inNormalizedTag: normalizedTag,
        inErrors: localErrors
    });

    validateSections({
        inSpec: localSpec,
        inPath: localPath,
        inErrors: localErrors
    });

    validateAttributes({
        inAttributes: localSpec.attributes,
        inPath: localPath,
        inDefinition: definition,
        inNormalizedTag: normalizedTag,
        inErrors: localErrors
    });

    const { childrenList } = validateChildren({
        inChildren: localSpec.children,
        inPath: localPath,
        inDefinition: definition,
        inNormalizedTag: normalizedTag,
        inErrors: localErrors
    });

    childrenList.forEach((child, index) => validateNode({
        inSpec: child,
        inPath: childPath({ inBase: childPath({ inBase: localPath, inKey: "children" }), inKey: index }),
        inErrors: localErrors
    }));
};

const validateSpec = ({ inSpec }) => {
    const localSpec = inSpec;
    const errors = [];

    validateNode({ inSpec: localSpec, inPath: "spec", inErrors: errors });

    return { isValid: errors.length === 0, errors };
};

export { validateSpec };
export default validateSpec;