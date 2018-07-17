queue()
.defer(d3.csv, "static/Salaries.csv")
.await(makeGraphs);

 function makeGraphs(error, salaryData) {
     var ndx = crossfilter(salaryData);
     
     salaryData.forEach(function(d){
      d.salary = parseInt(d.salary);
      d.yrs_since_phd = parseInt(d["yrs.since.phd"]);
      d.yrs_service = parseInt(d["yrs.service"]);
     });
     show_discipline_selector(ndx);
     
     show_percent_that_are_professors(ndx, "Female", "#percent-of-women-professors");
     show_percent_that_are_professors(ndx, "Male", "#percent-of-men-professors");
     
     show_gender_balance(ndx);
     show_average_salaries(ndx);
     show_rank_distribution(ndx);
     
     show_service_to_salary_correlation(ndx);
     show_phd_to_salary_correlation(ndx);
     
     dc.renderAll();
 }
 
 function show_discipline_selector(ndx) {
      dim = ndx.dimension(dc.pluck('discipline'));
     group = dim.group();
     
     dc.selectMenu("#discipline-selector")
     .dimension(dim)
     .group(group);
 }
 
 function show_percent_that_are_professors(ndx, gender, element) {
  var percentageThatAreProf = ndx.groupAll().reduce(
   function (p, v) {
    if (v.sex === gender){
     p.count++;
     if (v.rank === "Prof") {
      p.are_prof++;
     }
    }
    return p;
   },
   function (p, v) {
      if (v.sex === gender) {
     p.count--;
     if (v.rank === "Prof") {
      p.are_prof--;
     }
    }
    return p;
   },
   function () {
    return {count: 0, are_prof: 0};
   }
  );
  dc.numberDisplay(element)
  .formatNumber(d3.format(".2%"))
  .valueAccessor(function (d) {
   if (d.count === 0) {
    return 0;
   } else {
    return (d.are_prof / d.count);
   }
  })
  .group(percentageThatAreProf);
 }
 
 function show_gender_balance(ndx) {
     var dim = ndx.dimension(dc.pluck('sex'));
     var group = dim.group();
 
     dc.barChart("#gender-balance")
     .width(350)
     .height(250)
     .margins({top: 10, right: 50, bottom: 30, left: 50})
     .dimension(dim)
     .group(group)
     .transitionDuration(500)
     .x(d3.scale.ordinal())
     .xUnits(dc.units.ordinal)
     .xAxisLabel("Gender")
     .yAxis().ticks(20);
 }
 
 function show_average_salaries(ndx) {
  var dim = ndx.dimension(dc.pluck('sex'));
  
  function add_item(p, v) {
   p.count++;
   p.total+= v.salary;
   p.average = p.total / p.count;
   return p;
   
  }
  
  function remove_item(p, v) {
   p.count--;
   if(p.count === 0) {
    p.total = 0;
    p.average = 0;
   } else{
   p.total -= v.salary;
   p.average = p.total / p.count;
   }
   return p;
  }
  function initialise() {
   return {count: 0, total: 0, average: 0,}; 
   }
  var averageSalaryByGender = dim.group().reduce(add_item, remove_item, initialise);
  
  dc.barChart("#average-salaries")
    .width(350)
    .height(250)
    .margins({top: 10, right: 50, bottom: 30, left: 50})
    .dimension(dim)
    .group(averageSalaryByGender)
    .valueAccessor(function(d){
     return d.value.average.toFixed(2);
    })
  .transitionDuration(500)
  .x(d3.scale.ordinal())
  .xUnits(dc.units.ordinal)
  .elasticY(true)
  .xAxisLabel("Gender")
  .yAxis().ticks(4);
  
 }
 
 function show_rank_distribution(ndx) {
 
   function rankByGender (dimension, rank) {
    return dimension.group().reduce(
   function (p, v) {
    p.total++;
    if(v.rank === rank) {
     p.match++;
    }
    return p;
   },
   function (p, v) {
     p.total--;
    if(v.rank === rank) {
     p.match--;
    }
    return p;
   },
   function () {
    return {total: 0, match: 0};
   }
   );
   }
   var dim = ndx.dimension(dc.pluck("sex"));
   var profByGender = rankByGender(dim, "Prof");
   var asstProfByGender = rankByGender(dim, "AsstProf");
   var assocProfByGender = rankByGender(dim, "AssocProf");
   
   dc.barChart("#rank-distribution")
   .width(350)
   .height(250)
   .dimension(dim)
   .group(profByGender,"Prof")
   .stack(asstProfByGender, "Asst Prof")
   .stack(assocProfByGender, "Assoc Prof")
   .valueAccessor(function (d) {
    if(d.value.total > 0) {
     return (d.value.match / d.value.total) * 100;
    } else {
     return 0;
    }
   })
   .x(d3.scale.ordinal())
   .xUnits(dc.units.ordinal)
   .xAxisLabel("Gender")
   .legend(dc.legend().x(320).y(20).itemHeight(15).gap(5))
   .margins({top: 10, right: 100, bottom: 30, left: 30});
   
   console.log(profByGender.all());
 }
 function show_service_to_salary_correlation(ndx) {
  
  var genderColors = d3.scale.ordinal()
           .domain(["Female", "Male"])
           .range(["pink", "blue"]);
  var eDim = ndx.dimension(dc.pluck("yrs_service"));
  var experienceDim = ndx.dimension(function (d) {
   return [d.yrs_service, d.salary, d.rank, d.sex];
  });
  var experienceSalaryGroup = experienceDim.group();
  
  var minExperience = eDim.bottom(1)[0].yrs_service;
  var maxExperience = eDim.top(1)[0].yrs_service;
  
  dc.scatterPlot("#service-salary")
  .width(800)
  .height(400)
  .x(d3.scale.linear().domain([minExperience, maxExperience]))
  .brushOn(false)
  .symbolSize(8)
  .clipPadding(10)
  .yAxisLabel("Salary")
  .xAxisLabel("Years Of Service")
  .title(function(d){
   return d.key[2] + "earned" + d.key[1];
  })
  .colorAccessor(function(d){
   return d.key[3];
  })
  .colors(genderColors)
  .dimension(experienceDim)
  .group(experienceSalaryGroup)
  .margins({top: 10, right: 50, bottom: 75,  left: 75});
 }
 
 function show_phd_to_salary_correlation(ndx) {
  
  var genderColors = d3.scale.ordinal()
           .domain(["Female", "Male"])
           .range(["pink", "blue"]);
  var pDim = ndx.dimension(dc.pluck("yrs_since_phd"));
  var phdDim = ndx.dimension(function (d) {
   return [d.yrs_since_phd, d.salary, d.rank, d.sex];
  });
  var phdSalaryGroup = phdDim.group();
  
  var minPhd = pDim.bottom(1)[0].yrs_since_phd;
  var maxPhd = pDim.top(1)[0].yrs_since_phd;
  
  dc.scatterPlot("#phd-salary")
  .width(800)
  .height(400)
  .x(d3.scale.linear().domain([minPhd, maxPhd]))
  .brushOn(false)
  .symbolSize(8)
  .clipPadding(10)
  .yAxisLabel("Salary")
  .xAxisLabel("Years Since PhD")
  .title(function(d){
   return d.key[2] + "earned" + d.key[1];
  })
  .colorAccessor(function(d){
   return d.key[3];
  })
  .colors(genderColors)
  .dimension(phdDim)
  .group(phdSalaryGroup)
  .margins({top: 10, right: 50, bottom: 75,  left: 75});
 }
 
 
 
 
 