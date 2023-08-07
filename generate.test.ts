import { test } from "@jest/globals";
import { GraphQLEnumType, GraphQLObjectType, GraphQLScalarType } from "graphql/type/definition";
import { TypeNode } from "graphql/language/ast";
import { Kind } from "graphql/language/kinds";
import { glob } from "glob";
import { readFileSync } from "node:fs";

import { makeExecutableSchema } from "@graphql-tools/schema";
import { camelToSnake, screamingSnakeToUpperCame } from "./helpers";

const schemas = await glob("schema/*.graphqls");
const typeDefs = schemas.map(schema => readFileSync(schema, "utf8"))
const resolvers = {
  Query: {},
};
const schema = makeExecutableSchema({typeDefs, resolvers});

const scalarTemplate = `/// {TYPE_COMMENT}
pub struct {TYPE_NAME}(String);
`;

const enumTemplate = `/// {TYPE_COMMENT}
pub enum {TYPE_NAME} { {FIELDS}
}`;

const enumFieldTemplate = `
    /// {FIELD_COMMENT}
    {FIELD_NAME},`;

const objectTemplate = `/// {TYPE_COMMENT}
#[derive(SimpleObject)]
pub struct {TYPE_NAME} { {FIELDS}
}`;

const fieldTemplate = `
    /// {FIELD_COMMENT}
    {FIELD_NAME}: {FIELD_TYPE},`;

const queryTemplate = `#[derive(Default)]
pub struct {TYPE_NAME}Query;

#[Object]
impl {TYPE_NAME}Query {
    /// {TYPE_COMMENT}
    pub async fn {TYPE_CONSTRUCTOR}(&self, _ctx: &Context<'_>) -> Result<{RESULT_TYPE_NAME}> {
        unimplemented!()
    }
}`;

function typeNameFromList(type: TypeNode): string {
  switch (type.kind) {
    case Kind.NAMED_TYPE:
      // @ts-ignore
      return type.name.value;
    case Kind.LIST_TYPE:
      const typeName = typeNameFromList(type.type);
      return `Vec<${typeName}>`;
    case Kind.NON_NULL_TYPE:
      if (type.type.kind === Kind.NAMED_TYPE) {
        return type.type.name.value;
      } else {
        return typeNameFromList(type.type);
      }
  }
}

function gTypeToRustType(type: TypeNode): string {
  switch (type.kind) {
    case Kind.NAMED_TYPE:
      // @ts-ignore
      return `Option<${type.name.value}>`;
    case Kind.LIST_TYPE:
      const typeName = typeNameFromList(type);
      return `Option<${typeName}>`;
    case Kind.NON_NULL_TYPE:
      if (type.type.kind === Kind.NAMED_TYPE) {
        return type.type.name.value;
      } else {
        return typeNameFromList(type.type);
      }
  }
}

// TODO retrieve defined types from graphql schema files. should be extracted from
const typeNames: string[] = [];

test("generate", () => {
  for (let typeName of typeNames) {
    const t = schema.getType(typeName);

    switch (true) {
      case t instanceof GraphQLScalarType: {
        // @ts-ignore
        let type: GraphQLScalarType = t;
        const outputName = type.astNode?.name.value ?? "";
        const outputComment = type.astNode?.description?.value.replace(/\n/g, "\n/// ") ?? "";

        const output = scalarTemplate
          .replace("{TYPE_COMMENT}", outputComment)
          .replace("{TYPE_NAME}", outputName);
        console.log(output);
      }
        break;
      case t instanceof GraphQLObjectType: {
        // @ts-ignore
        let type: GraphQLObjectType = t;
        let fields = type.astNode?.fields?.map(node => {
          return {
            comment: node.description?.value.replace(/\n/g, "\n    /// ") ?? "",
            name: node.name.value,
            type: node.type,
          }
        }) ?? [];

        const outputFields = [];
        for (let field of fields) {
          const templateTypeName = gTypeToRustType(field.type);
          const outputField = fieldTemplate
            .replace("{FIELD_COMMENT}", field.comment)
            .replace("{FIELD_NAME}", camelToSnake(field.name))
            .replace("{FIELD_TYPE}", templateTypeName);

          outputFields.push(outputField);
        }

        const templateTypeComment = type.description?.replace(/\n/g, "\n/// ") ?? "";
        const templateTypeName = type.name;
        const templateFields = outputFields.join("");

        const output = objectTemplate
          .replace("{TYPE_COMMENT}", templateTypeComment)
          .replace("{TYPE_NAME}", templateTypeName)
          .replace("{FIELDS}", templateFields);
        console.log(output);
      }
        break;

      case t instanceof GraphQLEnumType: {
        // @ts-ignore
        let type: GraphQLEnumType = t;
        let fields = type.astNode?.values?.map(node => {
          return {
            comment: node.description?.value.replace(/\n/g, "\n    /// ") ?? "",
            name: node.name.value,
          }
        }) ?? [];

        const outputFields = [];
        for (let field of fields) {
          outputFields.push(enumFieldTemplate
            .replace("{FIELD_COMMENT}", field.comment)
            .replace("{FIELD_NAME}", screamingSnakeToUpperCame(field.name)));
        }

        const output = enumTemplate.replace("{TYPE_COMMENT}", type.description ?? "")
          .replace("{TYPE_NAME}", type.name)
          .replace("{FIELDS}", outputFields.join(""));

        console.log(output);
      }
        break;

      default:
        console.log("undefined type");
        break;
      // case t instanceof GraphQLInterfaceType:
      //   console.log("interface");
      //   break;
      // case t instanceof GraphQLUnionType:
      //   console.log("union");
      //   break;
    }
  }

  // query types
  // @ts-ignore
  const queryTypes: GraphQLObjectType = schema.getQueryType();
  const queryTypeFields = queryTypes?.astNode?.fields?.map(f => {
    return {
      comment: f.description?.value ?? "",
      name:  f.name.value,
      type: f.type,
    };
  }) ?? [];

  for (let field of queryTypeFields) {
    const outputName = field.name;
    const outputComment = field.comment.replace(/\n/g, "\n    /// ");
    const outputType = gTypeToRustType(field.type);

    const outputQuery = queryTemplate
      .replace(/{TYPE_NAME}/g, outputName)
      .replace(/{TYPE_CONSTRUCTOR}/g, camelToSnake(outputName))
      .replace("{TYPE_COMMENT}", outputComment)
      .replace("{RESULT_TYPE_NAME}", outputType);
    console.log(outputQuery);
  }
});
