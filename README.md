# PTE-MENL Dashboard (Frontend)

### Alapértelmezett input node-ok

- **Sunlight** (ID = 1)
- **Grid** (ID = 2)
- **Biogas** (ID = 3)
- **Sewage demand** (ID = 4)

### Alapértelmezett output node

- **Sewage farm** (ID = 13)

### Alapértelmezett energy node-ok

- **Battery** (ID = 6)
- **Electrolyzer** (ID = 7)
- **H2 storage** (ID = 8)
- **Biogas storage** (ID = 9)
- **H2 Fuel station** (ID = 10)
- **H2+Biogas engine** (ID = 11)
- **Biogas engine** (ID = 12)

### Alapértelmezett kapcsolatok (ID-k szerint)

```
1 -> 5    2 -> 7     3 -> 9     4 -> 13;
5 -> 13   5 -> 6     5 -> 7     6 -> 13;
7 -> 8    8 -> 10    8 -> 11    9 -> 11
9 -> 12   11 -> 13   12 -> 13
```

### Tesztfelület

URL: [https://mogyorosigabor.github.io/pte-menl-dashboard/](https://mogyorosigabor.github.io/pte-menl-dashboard/)