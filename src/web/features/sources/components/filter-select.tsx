"use client";

import type { Key } from "@heroui/react";
import { Label, ListBox, Select } from "@heroui/react";
import type { FilterSelectDef } from "../services/sources.service";

interface FilterSelectProps {
  filter: FilterSelectDef;
  value: string;
  onChange: (optionId: string) => void;
}

export function FilterSelect({ filter, value, onChange }: FilterSelectProps) {
  return (
    <Select
      className="w-full"
      placeholder={`Select ${filter.label.toLowerCase()}`}
      value={value as Key}
      onChange={(key) => onChange(String(key ?? filter.defaultOptionId))}
      aria-label={filter.label}
    >
      <Label>{filter.label}</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {filter.options.map((option) => (
            <ListBox.Item key={option.id} id={option.id} textValue={option.label}>
              {option.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
