import { z } from "zod";

export const PointSchema = z.strictObject({
  x: z.number().finite(),
  y: z.number().finite(),
});

export type Point = z.infer<typeof PointSchema>;

export const GeometricShapeKindSchema = z.enum([
  "line",
  "rectangle",
  "ellipse",
]);

export type GeometricShapeKind = z.infer<
  typeof GeometricShapeKindSchema
>;

export const ShapeKindSchema = z.union([
  GeometricShapeKindSchema,
  z.literal("text"),
]);

export type ShapeKind = z.infer<typeof ShapeKindSchema>;

export const ShapeColorSchema = z.enum(["black", "red", "blue", "green"]);

export type ShapeColor = z.infer<typeof ShapeColorSchema>;

export const GeometricShapeSchema = z.strictObject({
  kind: GeometricShapeKindSchema,
  color: ShapeColorSchema,
  start: PointSchema,
  end: PointSchema,
});

export type GeometricShape = z.infer<typeof GeometricShapeSchema>;

export const TextShapeSchema = z.strictObject({
  kind: z.literal("text"),
  color: ShapeColorSchema,
  position: PointSchema,
  text: z.string(),
});

export type TextShape = z.infer<typeof TextShapeSchema>;

export const ShapeSchema = z.union([GeometricShapeSchema, TextShapeSchema]);

export type Shape = z.infer<typeof ShapeSchema>;

export const SceneV1Schema = z.strictObject({
  version: z.literal(1),
  shapes: z.array(ShapeSchema),
});

export type SceneV1 = z.infer<typeof SceneV1Schema>;

export function isGeometricShapeKind(
  value: unknown,
): value is GeometricShapeKind {
  return GeometricShapeKindSchema.safeParse(value).success;
}

export function isShapeKind(value: unknown): value is ShapeKind {
  return ShapeKindSchema.safeParse(value).success;
}

export function isShapeColor(value: unknown): value is ShapeColor {
  return ShapeColorSchema.safeParse(value).success;
}

export function isPoint(value: unknown): value is Point {
  return PointSchema.safeParse(value).success;
}

export function isShape(value: unknown): value is Shape {
  return ShapeSchema.safeParse(value).success;
}

export function isSceneV1(value: unknown): value is SceneV1 {
  return SceneV1Schema.safeParse(value).success;
}
