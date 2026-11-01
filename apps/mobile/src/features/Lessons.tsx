import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
  Badge,
  Button,
  Card,
  Empty,
  Field,
  Screen,
  Txt,
} from "../components/ui";
import { LessonInput } from "../domain/model";
import { useSchool } from "../providers/AppProvider";
const blank = (): LessonInput => ({
  subject: "",
  className: "",
  topic: "",
  date: new Date().toISOString().slice(0, 10),
  objectives: "",
  content: "",
});
export function Lessons() {
  const { create } = useLocalSearchParams<{ create?: string }>();
  const { data, context, services, act, busy } = useSchool();
  const [form, setForm] = useState<LessonInput | null>(() =>
    create ? blank() : null,
  );
  const [id, setId] = useState<string>();
  const save = () =>
    void act(async () => {
      if (!form) return;
      await services.saveLesson(context, form, id);
      setForm(null);
    }, "Lesson note saved on device.");
  return (
    <Screen
      title={form ? "Prepare a lesson" : "Lesson notes"}
      subtitle="A little preparation. A great lesson."
      back={() => (form ? setForm(null) : router.back())}
    >
      {form ? (
        <>
          {(
            [
              "subject",
              "className",
              "topic",
              "date",
              "objectives",
              "content",
            ] as const
          ).map((key) => (
            <Field
              key={key}
              label={
                {
                  subject: "Subject",
                  className: "Class",
                  topic: "Topic",
                  date: "Lesson date · YYYY-MM-DD",
                  objectives: "Learning objectives",
                  content: "Lesson content",
                }[key]
              }
              value={form[key]}
              onChangeText={(value) => setForm({ ...form, [key]: value })}
              multiline={key === "content" || key === "objectives"}
            />
          ))}
          <Button title="Save draft on device" disabled={busy} onPress={save} />
        </>
      ) : (
        <>
          <Button
            title="New lesson note"
            icon="add-outline"
            onPress={() => {
              setId(undefined);
              setForm(blank());
            }}
          />
          {data.lessons.length === 0 && (
            <Empty
              title="Room for your next idea"
              detail="Create a lesson note. Saved drafts are available offline."
            />
          )}
          {data.lessons.map((l) => (
            <Card key={l.id}>
              <Badge text={l.status} />
              <Txt tone="heading">{l.topic}</Txt>
              <Txt tone="muted">
                {l.subject} · {l.className} · {l.date}
              </Txt>
              <Txt>{l.objectives}</Txt>
              <Button
                secondary
                title="Review & edit"
                onPress={() => {
                  setId(l.id);
                  setForm(l);
                }}
              />
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}
